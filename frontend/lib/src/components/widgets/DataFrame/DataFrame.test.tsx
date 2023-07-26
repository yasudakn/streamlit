/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from "react"

import { DataEditor as GlideDataEditor } from "@glideapps/glide-data-grid"

import { TEN_BY_TEN } from "@streamlit/lib/src/mocks/arrow"
import { mount } from "@streamlit/lib/src/test_util"
import { Quiver } from "@streamlit/lib/src/dataframes/Quiver"
import { Arrow as ArrowProto } from "@streamlit/lib/src/proto"

import { Resizable } from "re-resizable"
import DataFrame, { DataFrameProps } from "./DataFrame"
import { StyledResizableContainer } from "./styled-components"

const getProps = (
  data: Quiver,
  useContainerWidth = false,
  editingMode: ArrowProto.EditingMode = ArrowProto.EditingMode.READ_ONLY
): DataFrameProps => ({
  element: ArrowProto.create({
    data: new Uint8Array(),
    useContainerWidth,
    width: 400,
    height: 400,
    editingMode,
  }),
  data,
  width: 700,
  disabled: false,
  widgetMgr: {
    getStringValue: jest.fn(),
  } as any,
})

const { ResizeObserver } = window

describe("DataFrame widget", () => {
  const props = getProps(new Quiver({ data: TEN_BY_TEN }))

  beforeEach(() => {
    // Mocking ResizeObserver to prevent:
    // TypeError: window.ResizeObserver is not a constructor
    // @ts-expect-error
    delete window.ResizeObserver
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }))
  })

  afterEach(() => {
    window.ResizeObserver = ResizeObserver
    jest.restoreAllMocks()
  })

  it("renders without crashing", () => {
    const wrapper = mount(<DataFrame {...props} />)
    expect(wrapper.find(GlideDataEditor).length).toBe(1)
  })

  it("should have correct className", () => {
    const wrapper = mount(<DataFrame {...props} />)
    expect(wrapper.find(StyledResizableContainer).prop("className")).toContain(
      "stDataFrame"
    )
  })

  it("grid container should use full width when useContainerWidth is used", () => {
    const wrapper = mount(
      <DataFrame {...getProps(new Quiver({ data: TEN_BY_TEN }), true)} />
    )
    const dataFrameContainer = wrapper.find(Resizable).props() as any
    expect(dataFrameContainer.size.width).toBe(700)
    expect(dataFrameContainer.size.height).toBe(400)
  })

  it("grid container should render with specific size", () => {
    const wrapper = mount(<DataFrame {...props} />)
    const dataFrameContainer = wrapper.find(Resizable).props() as any
    expect(dataFrameContainer.size.width).toBe(400)
    expect(dataFrameContainer.size.height).toBe(400)
  })

  it("Touch detection correctly deactivates some features", () => {
    // Set window.matchMedia to simulate a touch device
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true,
    }))

    const wrapper = mount(
      <DataFrame
        {...getProps(
          new Quiver({ data: TEN_BY_TEN }),
          true,
          ArrowProto.EditingMode.FIXED
        )}
      />
    )
    const glideDataEditorProps = wrapper.find(GlideDataEditor).props()
    expect(glideDataEditorProps.rangeSelect).toBe("none")
    expect(glideDataEditorProps.fillHandle).toBe(false)
  })
})
