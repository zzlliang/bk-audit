# -*- coding: utf-8 -*-
"""
TencentBlueKing is pleased to support the open source community by making
蓝鲸智云 - 审计中心 (BlueKing - Audit Center) available.
Copyright (C) 2023 THL A29 Limited,
a Tencent company. All rights reserved.
Licensed under the MIT License (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at http://opensource.org/licenses/MIT
Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on
an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
either express or implied. See the License for the
specific language governing permissions and limitations under the License.
We undertake not to change the open source license (MIT license) applicable
to the current version of the project delivered to anyone in the future.
"""

import datetime
from typing import List, Set

import arrow
from django.db.models.enums import ChoicesMeta
from django.utils.translation import gettext, gettext_lazy
from rest_framework import serializers
from rest_framework.settings import api_settings

from api.bk_log.serializers import EsQueryFilterSerializer
from apps.meta.permissions import SearchLogPermission
from apps.meta.utils.fields import ACCESS_TYPE, RESULT_CODE, SYSTEM_ID
from apps.permission.handlers.actions import ActionEnum
from apps.permission.handlers.permission import Permission
from core.exceptions import PermissionException, ValidationError
from core.serializers import OrderSerializer
from core.utils.tools import format_date_string, parse_datetime
from services.web.databus.constants import PluginSceneChoices
from services.web.databus.models import CollectorPlugin
from services.web.query.constants import (
    COLLECT_SEARCH_CONFIG,
    DATE_FORMAT,
    DATE_PARTITION_FIELD,
    DEFAULT_COLLECTOR_SORT_LIST,
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    DEFAULT_SORT_LIST,
    DEFAULT_TIMEDELTA,
    SEARCH_MAX_LIMIT,
    SORT_ASC,
    SORT_DESC,
    TIMESTAMP_PARTITION_FIELD,
    AccessTypeChoices,
    CollectorSortFieldChoices,
    ResultCodeChoices,
)
from services.web.query.utils.search_config import QueryConditionOperator


class EsQueryAttrSerializer(serializers.Serializer):
    namespace = serializers.CharField()
    start_time = serializers.CharField(required=False)
    end_time = serializers.CharField(required=False)
    query_string = serializers.CharField(allow_blank=True)
    filter = EsQueryFilterSerializer(many=True)
    sort_list = serializers.ListField(default=[])
    start = serializers.IntegerField(default=DEFAULT_PAGE)
    size = serializers.IntegerField(default=DEFAULT_PAGE_SIZE)
    aggs = serializers.JSONField(default={})
    time_field = serializers.CharField(required=False, default="", allow_blank=True, allow_null=True)
    index_set_id = serializers.IntegerField(required=False)
    storage_cluster_id = serializers.IntegerField(required=False)
    scroll = serializers.CharField(required=False)
    include_end_time = serializers.BooleanField(required=False)


class FieldMapRequestSerializer(serializers.Serializer):
    namespace = serializers.CharField(label=gettext_lazy("命名空间"))
    timedelta = serializers.IntegerField(label=gettext_lazy("时间范围"), default=DEFAULT_TIMEDELTA)
    fields = serializers.CharField(label=gettext_lazy("字段列表"), help_text=gettext_lazy("多个字段使用逗号分隔"))

    def validate_fields(self, value: str):
        return [field for field in value.split(",") if field]


class EsQuerySearchAttrSerializer(serializers.Serializer):
    namespace = serializers.CharField()
    start_time = serializers.CharField()
    end_time = serializers.CharField()
    query_string = serializers.CharField(allow_blank=True, default=str)
    sort_list = serializers.CharField(help_text=gettext_lazy("多个字段以半角逗号分隔"), allow_blank=True, default=str)
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    index_set_id = serializers.IntegerField(required=False)
    storage_cluster_id = serializers.IntegerField(required=False)
    bind_system_info = serializers.BooleanField(default=True)
    scroll = serializers.CharField(required=False)
    include_end_time = serializers.BooleanField(required=False)

    def validate(self, attrs):
        # 检索数量
        attrs["start"] = (attrs["page"] - 1) * attrs["page_size"]
        attrs["size"] = max(
            (
                SEARCH_MAX_LIMIT - attrs["start"]
                if attrs["start"] + attrs["page_size"] > SEARCH_MAX_LIMIT
                else attrs["page_size"]
            ),
            0,
        )
        # 时间
        start_time = arrow.get(format_date_string(attrs["start_time"]))
        end_time = arrow.get(format_date_string(attrs["end_time"]))
        # 指定index set id时不做校验，用于事件查询
        if not attrs.get("index_set_id"):
            retention = (
                CollectorPlugin.objects.filter(
                    namespace=attrs["namespace"], plugin_scene=PluginSceneChoices.COLLECTOR.value
                )
                .order_by("-retention")[0]
                .retention
            )
            latest_start_time = arrow.get(
                format_date_string(
                    CollectorPlugin.objects.filter(
                        namespace=attrs["namespace"], plugin_scene=PluginSceneChoices.COLLECTOR.value
                    )
                    .order_by("-created_at")[0]
                    .created_at.astimezone()
                    .strftime(api_settings.DATETIME_FORMAT)
                )
            )
            # 若小于插件创建时间，则赋值插件创建时间
            start_time = max(start_time, latest_start_time)
            # 若小于数据过期时间，则赋值数据过期时间
            start_time = max(start_time, arrow.now() - datetime.timedelta(days=retention))
        # 结束时间不能小于开始时间
        end_time = max(end_time, start_time)
        attrs.update(
            {
                "start_time": start_time.strftime(api_settings.DATETIME_FORMAT),
                "end_time": end_time.strftime(api_settings.DATETIME_FORMAT),
            }
        )
        return attrs

    def validate_sort_list(self, value: str) -> list:
        if not value:
            return DEFAULT_SORT_LIST
        sort_keys = [item for item in value.split(",") if item]
        sort_list = []
        for key in sort_keys:
            if key.startswith("-"):
                sort_list.append([key[1:], SORT_DESC])
            else:
                sort_list.append([key, SORT_ASC])
        sort_list = sort_list or DEFAULT_SORT_LIST
        return sort_list

    def to_internal_value(self, data: dict) -> dict:
        validated_data = super().to_internal_value(data)
        validated_data["filter"] = []
        for key, val in data.items():
            # 屏蔽内置字段
            if key in self.fields.fields.keys():
                continue
            # 提前解析
            items = {item for item in val.split(",") if item}
            # 兼容ResultCode
            if key == RESULT_CODE.field_name and ResultCodeChoices.FAILED.value in items:
                validated_data["filter"] = self._build_reverse_filter(
                    key, items, ResultCodeChoices, validated_data["filter"]
                )
                continue
            # 兼容AccessType
            elif key == ACCESS_TYPE.field_name and AccessTypeChoices.OTHER.value in items:
                # 反向排除
                validated_data["filter"] = self._build_reverse_filter(
                    key, items, AccessTypeChoices, validated_data["filter"]
                )
                continue
            validated_data["filter"].append(
                {
                    "field": key,
                    "operator": "is one of",
                    "value": list(items),
                    "condition": "and",
                    "type": "field",
                }
            )
        return validated_data

    def _build_reverse_filter(self, key: str, items: Set[str], choices: ChoicesMeta, filters: List[dict]):
        all_choices = set(choices.values)
        # 全选等于没有这个条件
        if items == all_choices:
            return filters
        # 反向排除
        filters.extend(
            [
                {
                    "field": key,
                    "operator": "is not one of",
                    "value": list(all_choices - items),
                    "condition": "and",
                    "type": "field",
                },
                {
                    "field": key,
                    "operator": "exists",
                    "value": [],
                    "condition": "and",
                    "type": "field",
                },
            ]
        )
        return filters


class QuerySearchResponseSerializer(serializers.Serializer):
    page = serializers.IntegerField()
    num_pages = serializers.IntegerField()
    total = serializers.IntegerField()
    results = serializers.ListField(child=serializers.JSONField())


class QuerySearchFilterSerializer(serializers.Serializer):
    """
    检索条件
    """

    field_name = serializers.ChoiceField(label="字段名", choices=COLLECT_SEARCH_CONFIG.allowed_query_field_choices)
    keys = serializers.ListField(
        label=gettext_lazy("嵌套字段 key"), child=serializers.CharField(), default=list, allow_empty=True
    )
    operator = serializers.ChoiceField(
        label=gettext_lazy("Operator"), choices=COLLECT_SEARCH_CONFIG.allowed_operator_choices
    )
    filters = serializers.ListField(
        label=gettext_lazy("筛选值"),
        child=serializers.JSONField(),
        default=list,
        help_text=gettext_lazy("多个筛选值，每个值可以是字符串、整数或浮点数"),
        allow_empty=True,
    )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # 判断操作是否允许
        allow = COLLECT_SEARCH_CONFIG.judge_operator(attrs["field_name"], attrs["operator"])
        if not allow:
            raise ValidationError(message=gettext("字段%s不支持该操作符%s") % (attrs["field_name"], attrs["operator"]))
        # 判断字段是否支持嵌套 keys
        if not COLLECT_SEARCH_CONFIG.query_field_map[attrs["field_name"]].field.is_json:
            attrs["keys"] = []
        return attrs


class CollectorOrderSerializer(OrderSerializer):
    """
    采集器检索排序序列化器
    """

    order_field = serializers.ChoiceField(
        label=gettext_lazy("排序字段"),
        required=False,
        allow_null=True,
        allow_blank=True,
        choices=CollectorSortFieldChoices.choices,
    )


class CollectorSearchAllReqSerializer(serializers.Serializer):
    """
    日志查询(All)请求序列化器
    """

    namespace = serializers.CharField()
    start_time = serializers.CharField()
    end_time = serializers.CharField()
    filters = serializers.ListField(
        label=gettext_lazy("检索条件列表"),
        child=QuerySearchFilterSerializer(),
        allow_empty=True,
        default=list,
    )
    page = serializers.IntegerField(min_value=1)
    page_size = serializers.IntegerField(min_value=1, max_value=SEARCH_MAX_LIMIT)
    sort_list = serializers.ListField(
        label=gettext_lazy("排序字段"),
        child=CollectorOrderSerializer(),
        default=DEFAULT_COLLECTOR_SORT_LIST,
    )
    bind_system_info = serializers.BooleanField(default=True)

    @classmethod
    def _build_time_conditions(cls, validated_request_data: dict) -> List[dict]:
        """
        时间分区条件
        """

        start_time = parse_datetime(validated_request_data["start_time"])
        end_time = parse_datetime(validated_request_data["end_time"])
        start_ms = int(start_time.timestamp() * 1000)
        end_ms = int(end_time.timestamp() * 1000)
        return [
            {
                "field_name": DATE_PARTITION_FIELD,
                "operator": QueryConditionOperator.GTE.value,
                "filters": [start_time.strftime(DATE_FORMAT)],
            },
            {
                "field_name": DATE_PARTITION_FIELD,
                "operator": QueryConditionOperator.LTE.value,
                "filters": [end_time.strftime(DATE_FORMAT)],
            },
            {
                "field_name": TIMESTAMP_PARTITION_FIELD,
                "operator": QueryConditionOperator.GTE.value,
                "filters": [start_ms],
            },
            {
                "field_name": TIMESTAMP_PARTITION_FIELD,
                "operator": QueryConditionOperator.LTE.value,
                "filters": [end_ms],
            },
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not attrs.get("sort_list"):
            attrs["sort_list"] = DEFAULT_COLLECTOR_SORT_LIST
        time_conditions = self._build_time_conditions(attrs)
        attrs["filters"] = time_conditions + attrs["filters"]
        return attrs


class CollectorSearchReqSerializer(CollectorSearchAllReqSerializer):
    """
    日志查询请求序列化器
    """

    @classmethod
    def _build_system_conditions(cls, validated_request_data) -> List[dict]:
        """
        过滤有权限的系统
        """

        namespace = validated_request_data["namespace"]
        systems, authorized_systems = SearchLogPermission.get_auth_systems(namespace)
        if not authorized_systems:
            apply_data, apply_url = Permission().get_apply_data([ActionEnum.SEARCH_REGULAR_EVENT])
            raise PermissionException(
                action_name=ActionEnum.SEARCH_REGULAR_EVENT.name,
                apply_url=apply_url,
                permission=apply_data,
            )
        if len(systems) != len(authorized_systems):
            return [
                {
                    "field_name": SYSTEM_ID.field_name,
                    "operator": QueryConditionOperator.INCLUDE.value,
                    "filters": authorized_systems,
                }
            ]
        return []

    def validate(self, attrs):
        attrs = super().validate(attrs)
        system_conditions = self._build_system_conditions(attrs)
        attrs["filters"] = system_conditions + attrs["filters"]
        return attrs


class CollectorSearchConfigRespSerializer(serializers.Serializer):
    """
    查询配置响应序列化器
    """

    field = serializers.DictField()
    allow_operators = serializers.ListField(child=serializers.ChoiceField(choices=QueryConditionOperator.choices))


class CollectorSearchResponseSerializer(QuerySearchResponseSerializer):
    """
    日志查询响应序列化器
    """

    query_sql = serializers.CharField(required=False, allow_blank=True)
    count_sql = serializers.CharField(required=False, allow_blank=True)
