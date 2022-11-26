#!/usr/bin/env bash

# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -euo pipefail

: "${PARAMETER_PASSWORD:?"ERROR: PARAMETER_PASSWORD not set !!!!"}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

gpg \
  --quiet \
  --batch \
  --yes \
  --decrypt \
  --passphrase="$PARAMETER_PASSWORD" \
  --output ../../.credentials/snowflake.json \
  ./encrypted_credentials_snowflake.json.gpg
