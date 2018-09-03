/*
 * <<
 * Davinci
 * ==
 * Copyright (C) 2016 - 2017 EDP
 * ==
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * >>
 */

import { takeLatest, takeEvery } from 'redux-saga'
import { call, fork, put } from 'redux-saga/effects'
import {
  LOAD_SHARE_DASHBOARD,
  LOAD_SHARE_WIDGET,
  LOAD_SHARE_RESULTSET,
  LOAD_WIDGET_CSV,
  LOAD_CASCADESOURCE_FROM_DASHBOARD
} from './constants'
import {
  dashboardGetted,
  loadDashboardFail,
  widgetGetted,
  resultsetGetted,
  widgetCsvLoaded,
  loadWidgetCsvFail,
  cascadeSourceFromDashboardLoaded,
  loadCascadeSourceFromDashboardFail
} from './actions'

import request from '../../../app/utils/request'
import { errorHandler } from '../../../app/utils/util'
import api from '../../../app/utils/api'
import config, { env } from '../../../app/globalConfig'
const shareHost = config[env].shareHost

export function* getDashboard (action) {
  const { payload } = action
  try {
    const dashboard = yield call(request, `${api.share}/dashboard/${payload.token}`)
    yield put(dashboardGetted(dashboard.payload))
    payload.resolve(dashboard.payload)
  } catch (err) {
    yield put(loadDashboardFail())
    errorHandler(err)
  }
}

export function* getWidget (action) {
  const { payload } = action
  try {
    const asyncData = yield call(request, `${api.share}/widget/${payload.token}`)
    const widget = asyncData.payload
    yield put(widgetGetted(widget))

    if (payload.resolve) {
      payload.resolve(widget[0])
    }
  } catch (err) {
    errorHandler(err)
  }
}

export function* getResultset (action) {
  const { payload } = action
  const { renderType, itemId, dataToken, params: parameters } = payload
  const { filters, linkageFilters, globalFilters, params, linkageParams, globalParams, ...rest } = parameters

  try {
    const resultset = yield call(request, {
      method: 'post',
      url: `${api.share}/data/${dataToken}`,
      data: {
        ...rest,
        filters: filters.concat(linkageFilters).concat(globalFilters),
        params: params.concat(linkageParams).concat(globalParams)
      }
    })
    yield put(resultsetGetted(renderType, itemId, resultset.payload))
  } catch (err) {
    errorHandler(err)
  }
}

export function* getWidgetCsv (action) {
  const { itemId, params, token } = action.payload

  try {
    const path = yield call(request, {
      method: 'post',
      url: `${api.share}/csv/${token}`,
      data: params
    })
    yield put(widgetCsvLoaded(itemId))
    location.href = `${shareHost.substring(0, shareHost.lastIndexOf('/'))}/${path.payload}`
    // location.href = `data:application/octet-stream,${encodeURIComponent(asyncData)}`
  } catch (err) {
    yield put(loadWidgetCsvFail(itemId))
    errorHandler(err)
  }
}

export function* getCascadeSourceFromDashboard (action) {
  try {
    const { payload } = action
    const { flatTableId, controlId, token, column, parents } = payload

    const data = {
      adHoc: '',
      manualFilters: '',
      params: [],
      childFieldName: column,
      parents
    }

    const asyncData = yield call(request, {
      method: 'post',
      url: `${api.share}/resultset/${token}/distinct_value/${flatTableId}`,
      data
    })
    const values = resultsetConverter(readListAdapter(asyncData)).dataSource
    yield put(cascadeSourceFromDashboardLoaded(controlId, column, values))
  } catch (err) {
    yield put(loadCascadeSourceFromDashboardFail(err))
    errorHandler(err)
  }
}

export default function* rootDashboardSaga (): IterableIterator<any> {
  yield [
    takeLatest(LOAD_SHARE_DASHBOARD, getDashboard),
    takeEvery(LOAD_SHARE_WIDGET, getWidget),
    takeEvery(LOAD_SHARE_RESULTSET, getResultset),
    takeLatest(LOAD_WIDGET_CSV, getWidgetCsv),
    takeEvery(LOAD_CASCADESOURCE_FROM_DASHBOARD, getCascadeSourceFromDashboard)
  ]
}
