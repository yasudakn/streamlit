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

import axios from "axios"
import { ensureError } from "@streamlit/lib/src/util/ErrorHandling"
import { SessionInfo } from "@streamlit/lib/src/SessionInfo"

export class MapboxTokenNotProvidedError extends Error {}
export class MapboxTokenFetchingError extends Error {}

/**
 * A remote file that stores user-visible tokens.
 */
export const TOKENS_URL = "https://data.streamlit.io/tokens.json"

export class MapboxToken {
  static token?: string

  static commandLine?: string

  /**
   * Expose a singleton MapboxToken:
   * - If the user specified a token in their streamlit config, return it.
   * - Else, fetch the remote "tokens.json" and return the "mapbox" entry.
   *
   * (The returned value is cached in memory, so the remote resource will
   * only be fetched once per session.)
   */
  public static async get(sessionInfo: SessionInfo): Promise<string> {
    const { commandLine, userMapboxToken } = sessionInfo.current

    if (
      !MapboxToken.token ||
      MapboxToken.commandLine !== commandLine.toLowerCase()
    ) {
      if (userMapboxToken !== "") {
        MapboxToken.token = userMapboxToken
      } else {
        MapboxToken.token = await this.fetchToken(TOKENS_URL, "mapbox")
      }

      MapboxToken.commandLine = commandLine.toLowerCase()
    }

    return MapboxToken.token
  }

  private static async fetchToken(
    url: string,
    tokenName: string
  ): Promise<string> {
    try {
      const response = await axios.get(url)
      const { [tokenName]: token } = response.data

      if (token == null || token === "") {
        throw new Error(`Missing token "${tokenName}"`)
      }

      return token
    } catch (e) {
      const error = ensureError(e)
      throw new MapboxTokenFetchingError(`${error.message} (${url})`)
    }
  }
}
