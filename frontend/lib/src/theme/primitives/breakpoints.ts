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

export const breakpoints = {
  toast: "68px",
  // This value is used to determine whether we should show/hide the - and + buttons in st.number_input.
  // We use 120px because at ~100px three-digit numbers (like 0.00) start to be hidden by these controls.
  numberInputControls: 120,
  sm: "576px",
  columns: "640px",
  md: "768px",
  lg: "992px",
  xl: "1200px",
}
