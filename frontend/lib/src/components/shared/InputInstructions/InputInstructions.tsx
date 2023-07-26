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

import React, { ReactElement } from "react"
import { isFromMac } from "@streamlit/lib/src/util/utils"
import { StyledWidgetInstructions } from "@streamlit/lib/src/components/widgets/BaseWidget"
import { StyledMessage } from "./styled-components"

export interface Props {
  dirty: boolean
  value: string
  maxLength?: number
  className?: string
  type?: "multiline" | "single" | "chat"
  inForm: boolean
}

const InputInstructions = ({
  dirty,
  value,
  maxLength,
  className,
  type = "single",
  inForm,
}: Props): ReactElement => {
  const messages: ReactElement[] = []
  const addMessage = (text: string, shouldBlink = false): void => {
    messages.push(
      <StyledMessage
        key={messages.length}
        includeDot={messages.length > 0}
        shouldBlink={shouldBlink}
      >
        {text}
      </StyledMessage>
    )
  }

  if (dirty) {
    const toSubmitFormOrApplyText = inForm ? "submit form" : "apply"
    if (type === "multiline") {
      const commandKey = isFromMac() ? "⌘" : "Ctrl"
      addMessage(`Press ${commandKey}+Enter to ${toSubmitFormOrApplyText}`)
    } else if (type === "single") {
      addMessage(`Press Enter to ${toSubmitFormOrApplyText}`)
    }
  }

  if (maxLength && (type !== "chat" || dirty)) {
    addMessage(
      `${value.length}/${maxLength}`,
      dirty && value.length >= maxLength
    )
  }

  return (
    <StyledWidgetInstructions
      data-testid="InputInstructions"
      className={className}
    >
      {messages}
    </StyledWidgetInstructions>
  )
}

export default InputInstructions
