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

import { EmotionIcon } from "@emotion-icons/emotion-icon"
import isPropValid from "@emotion/is-prop-valid"
import styled from "@emotion/styled"
import { IconSize, ThemeColor, computeSpacingStyle } from "src/theme"

interface StyledIconProps {
  as?: EmotionIcon
  color: ThemeColor
  size: IconSize
  margin: string
  padding: string
}

export const StyledIcon = styled("span", {
  shouldForwardProp: (prop: string) =>
    isPropValid(prop) && !["size", "as"].includes(prop),
})<StyledIconProps>(({ color, size, margin, padding, theme }) => {
  return {
    color: theme.colors[color],
    fill: "currentColor",
    display: "inline-flex",
    alignItems: "center",
    justifyContents: "center",
    fontSize: theme.iconSizes[size],
    width: theme.iconSizes[size],
    height: theme.iconSizes[size],
    margin: computeSpacingStyle(margin, theme),
    padding: computeSpacingStyle(padding, theme),
  }
})

interface StyledEmojiIconProps {
  size: IconSize
  margin: string
  padding: string
}

export const StyledEmojiIcon = styled.span<StyledEmojiIconProps>(
  ({ size, margin, padding, theme }) => {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContents: "center",
      fontSize: theme.iconSizes[size],
      width: theme.iconSizes[size],
      height: theme.iconSizes[size],
      margin: computeSpacingStyle(margin, theme),
      padding: computeSpacingStyle(padding, theme),
    }
  }
)
