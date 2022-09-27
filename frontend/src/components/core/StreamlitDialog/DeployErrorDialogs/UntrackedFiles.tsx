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
import { IDeployErrorDialog } from "./types"

function UntrackedFiles(): IDeployErrorDialog {
  return {
    title: "Unable to deploy app",
    body: (
      <>
        <p>
          This Git repo has untracked files. You may want to commit them before
          continuing.
        </p>
        <p>
          Alternatively, you can either delete the files (if they're not
          needed) or add them to your <strong>.gitignore</strong>.
        </p>
      </>
    ),
  }
}

export default UntrackedFiles
