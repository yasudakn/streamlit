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
import {
  Balloons as BalloonsProto,
  ForwardMsgMetadata,
  Snow as SnowProto,
} from "@streamlit/lib/src/proto"
import { render } from "@streamlit/lib/src/test_util"
import { ElementNode } from "@streamlit/lib/src/AppNode"
import { ScriptRunState } from "@streamlit/lib/src/ScriptRunState"
import { waitFor } from "@testing-library/dom"
import {
  createFormsData,
  WidgetStateManager,
} from "@streamlit/lib/src/WidgetStateManager"
import { FileUploadClient } from "@streamlit/lib/src/FileUploadClient"
import { ComponentRegistry } from "@streamlit/lib/src/components/widgets/CustomComponent"
import { mockEndpoints, mockSessionInfo } from "@streamlit/lib/src/mocks/mocks"
import ElementNodeRenderer, {
  ElementNodeRendererProps,
} from "./ElementNodeRenderer"

function createBalloonNode(scriptRunId: string): ElementNode {
  const node = new ElementNode(
    new BalloonsProto({
      show: true,
    }),
    ForwardMsgMetadata.create({}),
    scriptRunId
  )
  node.element.type = "balloons"
  return node
}

function createSnowNode(scriptRunId: string): ElementNode {
  const node = new ElementNode(
    new SnowProto({
      show: true,
    }),
    ForwardMsgMetadata.create({}),
    scriptRunId
  )
  node.element.type = "snow"
  return node
}

function getProps(
  props: Partial<ElementNodeRendererProps> &
    Pick<ElementNodeRendererProps, "node" | "scriptRunId">
): ElementNodeRendererProps {
  const sessionInfo = mockSessionInfo()
  const endpoints = mockEndpoints()
  return {
    endpoints: endpoints,
    scriptRunState: ScriptRunState.RUNNING,
    sessionInfo: sessionInfo,
    widgetMgr: new WidgetStateManager({
      sendRerunBackMsg: jest.fn(),
      formsDataChanged: jest.fn(),
    }),
    widgetsDisabled: false,
    uploadClient: new FileUploadClient({
      sessionInfo: sessionInfo,
      endpoints,
      formsWithPendingRequestsChanged: () => {},
    }),
    componentRegistry: new ComponentRegistry(endpoints),
    formsData: createFormsData(),
    width: 1000,
    ...props,
  }
}

describe("ElementNodeRenderer Block Component", () => {
  describe("render Balloons", () => {
    it("should NOT render a stale component", async () => {
      const scriptRunId = "SCRIPT_RUN_ID"
      const props = getProps({
        node: createBalloonNode(scriptRunId),
        scriptRunId: "NEW_SCRIPT_ID",
      })
      const wrapper = render(<ElementNodeRenderer {...props} />)

      await waitFor(() =>
        expect(wrapper.baseElement.textContent).not.toContain("Loading...")
      )
      expect(
        wrapper.baseElement.querySelectorAll(".element-container > *")
      ).toHaveLength(0)
    })

    it("should render a fresh component", async () => {
      const scriptRunId = "SCRIPT_RUN_ID"
      const props = getProps({
        node: createBalloonNode(scriptRunId),
        scriptRunId,
      })

      const wrapper = render(<ElementNodeRenderer {...props} />)

      await waitFor(() =>
        expect(wrapper.baseElement.textContent).not.toContain("Loading...")
      )
      expect(
        wrapper.baseElement.querySelectorAll(".element-container > *")
      ).toHaveLength(1)
      expect(wrapper.baseElement.querySelectorAll(".balloons")).toHaveLength(1)
    })
  })

  describe("render Snow", () => {
    it("should NOT render a stale component", async () => {
      const scriptRunId = "SCRIPT_RUN_ID"
      const props = getProps({
        node: createSnowNode(scriptRunId),
        scriptRunId: "NEW_SCRIPT_ID",
      })
      const wrapper = render(<ElementNodeRenderer {...props} />)

      await waitFor(() =>
        expect(wrapper.baseElement.textContent).not.toContain("Loading...")
      )
      expect(
        wrapper.baseElement.querySelectorAll(".element-container > *")
      ).toHaveLength(0)
    })

    it("should render a fresh component", async () => {
      const scriptRunId = "SCRIPT_RUN_ID"
      const props = getProps({
        node: createSnowNode(scriptRunId),
        scriptRunId,
      })
      const wrapper = render(<ElementNodeRenderer {...props} />)

      await waitFor(() =>
        expect(wrapper.baseElement.textContent).not.toContain("Loading...")
      )
      expect(
        wrapper.baseElement.querySelectorAll(".element-container > *")
      ).toHaveLength(1)
      expect(wrapper.baseElement.querySelectorAll(".snow")).toHaveLength(1)
    })
  })
})
