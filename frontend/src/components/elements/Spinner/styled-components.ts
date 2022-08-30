/**
 * @license
 * Copyright 2018-2022 Streamlit Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import styled from "@emotion/styled"
import { StyledSpinnerNext } from "baseui/spinner"
import isPropValid from "@emotion/is-prop-valid"

export const ThemedStyledSpinner = styled(StyledSpinnerNext, {
  shouldForwardProp: isPropValid,
})(({ theme, $usingCustomTheme }) => {
  return {
    marginTop: theme.spacing.none,
    marginBottom: theme.spacing.none,
    marginRight: theme.spacing.none,
    marginLeft: theme.spacing.none,
    borderColor: theme.colors.fadedText10,
    borderTopColor: $usingCustomTheme
      ? theme.colors.primary
      : theme.colors.blue70,
    flexGrow: 0,
    flexShrink: 0,
  }
})

export const StyledSpinnerContainer = styled.div(({ theme }) => ({
  display: "flex",
  gap: theme.spacing.lg,
  alignItems: "center",
  width: "100%",
}))
