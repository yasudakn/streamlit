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

import axios, { AxiosRequestConfig, AxiosResponse, CancelToken } from "axios"
import {
  BaseUriParts,
  buildHttpUri,
  SVG_PREFIX,
  xssSanitizeSvg,
} from "src/lib/util/UriUtil"
import { StreamlitEndpoints } from "src/lib/StreamlitEndpoints"
import { IAppPage } from "src/lib/proto"
import { getCookie } from "src/lib/util/utils"

interface Props {
  getServerUri: () => BaseUriParts | undefined
  csrfEnabled: boolean
}

const MEDIA_ENDPOINT = "/media"
const UPLOAD_FILE_ENDPOINT = "/_stcore/upload_file"
const COMPONENT_ENDPOINT_BASE = "/component"
const FORWARD_MSG_CACHE_ENDPOINT = "/_stcore/message"

/** Default Streamlit server implementation of the StreamlitEndpoints interface. */
export class DefaultStreamlitEndpoints implements StreamlitEndpoints {
  private readonly getServerUri: () => BaseUriParts | undefined

  private readonly csrfEnabled: boolean

  private cachedServerUri?: BaseUriParts

  public constructor(props: Props) {
    this.getServerUri = props.getServerUri
    this.csrfEnabled = props.csrfEnabled
  }

  public buildComponentURL(componentName: string, path: string): string {
    return buildHttpUri(
      this.requireServerUri(),
      `${COMPONENT_ENDPOINT_BASE}/${componentName}/${path}`
    )
  }

  /**
   * Construct a URL for a media file. If the url is relative and starts with
   * "/media", assume it's being served from Streamlit and construct it
   * appropriately. Otherwise leave it alone.
   */
  public buildMediaURL(url: string): string {
    if (url.startsWith(SVG_PREFIX)) {
      return `${SVG_PREFIX}${xssSanitizeSvg(url)}`
    }
    return url.startsWith(MEDIA_ENDPOINT)
      ? buildHttpUri(this.requireServerUri(), url)
      : url
  }

  /** Construct a URL for an app page in a multi-page app. */
  public buildAppPageURL(
    pageLinkBaseURL: string | undefined,
    page: IAppPage,
    pageIndex: number
  ): string {
    const pageName = page.pageName as string
    const navigateTo = pageIndex === 0 ? "" : pageName

    if (pageLinkBaseURL != null && pageLinkBaseURL.length > 0) {
      return `${pageLinkBaseURL}/${navigateTo}`
    }

    // NOTE: We use window.location to get the port instead of
    // getBaseUriParts() because the port may differ in dev mode (since
    // the frontend is served by the react dev server and not the
    // streamlit server).
    const { port, protocol } = window.location
    const { basePath, host } = this.requireServerUri()
    const portSection = port ? `:${port}` : ""
    const basePathSection = basePath ? `${basePath}/` : ""

    return `${protocol}//${host}${portSection}/${basePathSection}${navigateTo}`
  }

  public async uploadFileUploaderFile(
    file: File,
    widgetId: string,
    sessionId: string,
    onUploadProgress?: (progressEvent: any) => void,
    cancelToken?: CancelToken
  ): Promise<number> {
    const form = new FormData()
    form.append("sessionId", sessionId)
    form.append("widgetId", widgetId)
    form.append(file.name, file)

    return this.csrfRequest<number>(UPLOAD_FILE_ENDPOINT, {
      cancelToken,
      method: "POST",
      data: form,
      responseType: "text",
      onUploadProgress,
    }).then(response => {
      // Sanity check. Axios should be returning a number here.
      if (typeof response.data === "number") {
        return response.data
      }

      throw new Error(
        `Bad uploadFile response: expected a number but got '${response.data}'`
      )
    })
  }

  public async fetchCachedForwardMsg(hash: string): Promise<Uint8Array> {
    const serverURI = this.requireServerUri()
    const rsp = await axios.request({
      url: buildHttpUri(
        serverURI,
        `${FORWARD_MSG_CACHE_ENDPOINT}?hash=${hash}`
      ),
      method: "GET",
      responseType: "arraybuffer",
    })

    return new Uint8Array(rsp.data)
  }

  /**
   * Fetch the server URI. If our server is disconnected, default to the most
   * recent cached value of the URI. If we're disconnected and have no cached
   * value, throw an Error.
   */
  private requireServerUri(): BaseUriParts {
    const serverUri = this.getServerUri()
    if (serverUri != null) {
      this.cachedServerUri = serverUri
      return serverUri
    }

    if (this.cachedServerUri != null) {
      return this.cachedServerUri
    }

    throw new Error("not connected to a server!")
  }

  /**
   * Wrapper around axios.request to update the request config with
   * CSRF headers if client has CSRF protection enabled.
   */
  private csrfRequest<T = any, R = AxiosResponse<T>>(
    url: string,
    params: AxiosRequestConfig
  ): Promise<R> {
    const serverURI = this.requireServerUri()
    params.url = buildHttpUri(serverURI, url)

    if (this.csrfEnabled) {
      const xsrfCookie = getCookie("_xsrf")
      if (xsrfCookie != null) {
        params.headers = {
          "X-Xsrftoken": xsrfCookie,
          ...(params.headers || {}),
        }
        params.withCredentials = true
      }
    }

    return axios.request<T, R>(params)
  }
}
