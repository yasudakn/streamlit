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
import { ShallowWrapper, ReactWrapper } from "enzyme"
import cloneDeep from "lodash/cloneDeep"
import { LocalStore } from "src/lib/storageUtils"
import { hashString } from "src/lib/utils"
import { shallow, mount } from "src/lib/test_util"
import {
  CustomThemeConfig,
  ForwardMsg,
  NewSession,
  PageConfig,
  PageInfo,
  PageNotFound,
  PagesChanged,
} from "src/autogen/proto"
import { S4ACommunicationHOC } from "src/hocs/withS4ACommunication/withS4ACommunication"
import {
  IMenuItem,
  IToolbarItem,
  S4ACommunicationState,
} from "src/hocs/withS4ACommunication/types"
import { ConnectionState } from "src/lib/ConnectionState"
import { MetricsManager } from "src/lib/MetricsManager"
import { getMetricsManagerForTest } from "src/lib/MetricsManagerTestUtils"
import { SessionInfo, Args as SessionInfoArgs } from "src/lib/SessionInfo"
import {
  CUSTOM_THEME_NAME,
  createAutoTheme,
  darkTheme,
  lightTheme,
  toExportedTheme,
} from "src/theme"
import Modal from "./components/shared/Modal"
import { DialogType, StreamlitDialog } from "./components/core/StreamlitDialog"
import { App, Props } from "./App"
import MainMenu from "./components/core/MainMenu"
import ToolbarActions from "./components/core/ToolbarActions"

jest.mock("src/lib/ConnectionManager")

const getS4ACommunicationState = (
  extend?: Partial<S4ACommunicationState>
): S4ACommunicationState => ({
  forcedModalClose: false,
  hideSidebarNav: false,
  isOwner: true,
  menuItems: [],
  pageLinkBaseUrl: "",
  queryParams: "",
  requestedPageScriptHash: null,
  sidebarChevronDownshift: 0,
  streamlitShareMetadata: {},
  toolbarItems: [],
  ...extend,
})

const getS4ACommunicationProp = (
  extend?: Partial<S4ACommunicationHOC>
): S4ACommunicationHOC => ({
  connect: jest.fn(),
  sendMessage: jest.fn(),
  onModalReset: jest.fn(),
  onPageChanged: jest.fn(),
  currentState: getS4ACommunicationState({}),
  ...extend,
})

const getProps = (extend?: Partial<Props>): Props => ({
  screenCast: {
    currentState: "OFF",
    toggleRecordAudio: jest.fn(),
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
  },
  s4aCommunication: getS4ACommunicationProp({}),
  theme: {
    activeTheme: lightTheme,
    availableThemes: [],
    setTheme: jest.fn(),
    addThemes: jest.fn(),
  },
  ...extend,
})

const getWrapper = (): ReactWrapper => {
  const mountPoint = document.createElement("div")
  mountPoint.setAttribute("id", "ConnectionStatus")
  document.body.appendChild(mountPoint)
  const props = getProps()

  return mount(<App {...props} />, { attachTo: mountPoint })
}

// Prevent "moment-timezone requires moment" exception when mocking "moment".
jest.mock("moment-timezone", () => jest.fn())
jest.mock("moment", () =>
  jest.fn().mockImplementation(() => ({
    format: () => "date",
  }))
)

describe("App", () => {
  beforeEach(() => {
    SessionInfo.current = new SessionInfo({
      appId: "aid",
      sessionId: "sessionId",
      streamlitVersion: "sv",
      pythonVersion: "pv",
      installationId: "iid",
      installationIdV3: "iid3",
      authorEmail: "ae",
      maxCachedMessageAge: 2,
      commandLine: "command line",
      userMapboxToken: "mpt",
    } as SessionInfoArgs)
    MetricsManager.current = getMetricsManagerForTest()
  })

  afterEach(() => {
    const UnsafeSessionInfo = SessionInfo as any
    UnsafeSessionInfo.singleton = undefined
  })

  it("renders without crashing", () => {
    const wrapper = getWrapper()

    expect(wrapper.html()).not.toBeNull()
  })

  it("reloads when streamlit server version changes", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)

    // A HACK to mock `window.location.reload`.
    // NOTE: The mocking must be done after mounting,
    // but before `handleMessage` is called.
    const { location } = window
    // @ts-ignore
    delete window.location
    // @ts-ignore
    window.location = { reload: jest.fn() }

    const fwMessage = new ForwardMsg()
    fwMessage.newSession = {
      config: {},
      initialize: {
        environmentInfo: {
          streamlitVersion: "svv",
        },
        sessionId: "sessionId",
        userInfo: {},
        sessionState: {},
      },
    }

    // @ts-ignore
    wrapper.instance().handleMessage(fwMessage)

    expect(window.location.reload).toHaveBeenCalled()

    // Restore `window.location`.
    window.location = location
  })

  it("starts screencast recording when the MainMenu is clicked", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)

    wrapper.setState({
      scriptName: "scriptName",
    })

    wrapper
      .find(MainMenu)
      .props()
      .screencastCallback()

    expect(props.screenCast.startRecording).toHaveBeenCalledWith(
      "streamlit-scriptName-date"
    )
  })

  it("stops screencast when esc is pressed", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)

    // @ts-ignore
    wrapper.instance().keyHandlers.STOP_RECORDING()

    expect(props.screenCast.stopRecording).toBeCalled()
  })

  it("shows s4aMenuItems", () => {
    const props = getProps({
      s4aCommunication: getS4ACommunicationProp({
        connect: jest.fn(),
        sendMessage: jest.fn(),
        currentState: getS4ACommunicationState({
          queryParams: "",
          menuItems: [
            {
              type: "separator",
            },
          ] as IMenuItem[],
          toolbarItems: [],
          forcedModalClose: false,
          isOwner: true,
        }),
      }),
    })
    const wrapper = shallow(<App {...props} />)

    expect(wrapper.find(MainMenu).prop("s4aMenuItems")).toStrictEqual([
      { type: "separator" },
    ])
  })

  it("shows s4aToolbarItems", () => {
    const props = getProps({
      s4aCommunication: getS4ACommunicationProp({
        connect: jest.fn(),
        sendMessage: jest.fn(),
        currentState: getS4ACommunicationState({
          queryParams: "",
          toolbarItems: [
            {
              key: "favorite",
              icon: "star.svg",
            },
          ] as IToolbarItem[],
        }),
      }),
    })
    const wrapper = shallow(<App {...props} />)
    wrapper.setState({ hideTopBar: false })

    expect(wrapper.find(ToolbarActions).prop("s4aToolbarItems")).toStrictEqual(
      [
        {
          key: "favorite",
          icon: "star.svg",
        },
      ]
    )
  })

  it("closes modals when the modal closure message has been received", () => {
    const wrapper = shallow(<App {...getProps()} />)
    const dialog = StreamlitDialog({
      type: DialogType.ABOUT,
      onClose: () => {},
    })
    wrapper.setState({ dialog })
    expect(wrapper.find(Modal)).toHaveLength(1)
    const onModalReset = jest.fn()
    wrapper.setProps(
      getProps({
        s4aCommunication: getS4ACommunicationProp({
          currentState: getS4ACommunicationState({ forcedModalClose: true }),
          onModalReset,
        }),
      })
    )
    expect(wrapper.find(Modal)).toHaveLength(0)
    expect(onModalReset).toBeCalled()
  })

  it("does not prevent a modal from opening when closure message is set", () => {
    const onModalReset = jest.fn()
    const wrapper = shallow(
      <App
        {...getProps({
          s4aCommunication: getS4ACommunicationProp({
            currentState: getS4ACommunicationState({
              menuItems: [],
              queryParams: "",
              forcedModalClose: false,
            }),
            onModalReset,
            sendMessage: jest.fn(),
          }),
        })}
      />
    )
    wrapper.setProps(
      getProps({
        s4aCommunication: getS4ACommunicationProp({
          currentState: getS4ACommunicationState({ forcedModalClose: true }),
          onModalReset,
        }),
      })
    )
    expect(onModalReset).toBeCalled()
    wrapper.setProps(
      getProps({
        s4aCommunication: getS4ACommunicationProp({
          currentState: getS4ACommunicationState({ forcedModalClose: false }),
          onModalReset,
        }),
      })
    )
    const dialog = StreamlitDialog({
      type: DialogType.ABOUT,
      onClose: () => {},
    })
    wrapper.setState({ dialog })
    expect(wrapper.find(Modal)).toHaveLength(1)
  })

  it("sends the active theme to the host when the app is first rendered", () => {
    const props = getProps()
    shallow(<App {...props} />)

    // @ts-ignore
    expect(props.s4aCommunication.sendMessage).toHaveBeenCalledWith({
      type: "SET_THEME_CONFIG",
      themeInfo: toExportedTheme(lightTheme.emotion),
    })
  })

  it("both sets theme locally and sends to host when setAndSendTheme is called", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)
    const mockThemeConfig = { emotion: darkTheme.emotion }

    // @ts-ignore
    wrapper.instance().setAndSendTheme(mockThemeConfig)

    // @ts-ignore
    expect(props.theme.setTheme).toHaveBeenCalledWith(mockThemeConfig)

    // @ts-ignore
    expect(props.s4aCommunication.sendMessage).toHaveBeenCalledWith({
      type: "SET_THEME_CONFIG",
      themeInfo: toExportedTheme(darkTheme.emotion),
    })
  })

  it("hides the top bar if hideTopBar === true", () => {
    const wrapper = shallow(<App {...getProps()} />)
    // hideTopBar is true by default

    expect(wrapper.find("WithTheme(StatusWidget)").exists()).toBe(false)
    expect(wrapper.find("ToolbarActions").exists()).toBe(false)
  })

  it("shows the top bar if hideTopBar === false", () => {
    const wrapper = shallow(<App {...getProps()} />)
    wrapper.setState({ hideTopBar: false })

    expect(wrapper.find("WithTheme(StatusWidget)").exists()).toBe(true)
    expect(wrapper.find("ToolbarActions").exists()).toBe(true)
  })

  it("updates state.appPages when it receives a PagesChanged msg", () => {
    const appPages = [
      { icon: "", pageName: "bob", scriptPath: "bob.py" },
      { icon: "", pageName: "carl", scriptPath: "carl.py" },
    ]

    const msg = new ForwardMsg()
    msg.pagesChanged = new PagesChanged({ appPages })

    const props = getProps()
    const wrapper = shallow(<App {...props} />)
    expect(wrapper.find("AppView").prop("appPages")).toEqual([])

    const instance = wrapper.instance() as App
    instance.handleMessage(msg)
    expect(wrapper.find("AppView").prop("appPages")).toEqual(appPages)

    expect(props.s4aCommunication.sendMessage).toHaveBeenCalledWith({
      type: "SET_APP_PAGES",
      appPages,
    })
  })

  it("responds to page change requests", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)
    const instance = wrapper.instance() as App
    instance.onPageChange = jest.fn()

    wrapper.setProps(
      getProps({
        s4aCommunication: getS4ACommunicationProp({
          currentState: getS4ACommunicationState({
            requestedPageScriptHash: "hash1",
          }),
        }),
      })
    )
    wrapper.update()

    expect(instance.onPageChange).toHaveBeenCalledWith("hash1")
    expect(
      props.s4aCommunication.currentState.requestedPageScriptHash
    ).toBeNull()
  })
})

const mockGetBaseUriParts = (basePath?: string) => () => ({
  basePath: basePath || "",
})

describe("App.handleNewSession", () => {
  const NEW_SESSION_JSON = {
    config: {
      gatherUsageStats: false,
      maxCachedMessageAge: 0,
      mapboxToken: "mapboxToken",
      allowRunOnSave: false,
      hideSidebarNav: false,
    },
    customTheme: {
      primaryColor: "red",
    },
    initialize: {
      userInfo: {
        installationId: "installationId",
        installationIdV3: "installationIdV3",
        email: "email",
      },
      environmentInfo: {
        streamlitVersion: "streamlitVersion",
        pythonVersion: "pythonVersion",
      },
      sessionState: {
        runOnSave: false,
        scriptIsRunning: false,
      },
      sessionId: "sessionId",
      commandLine: "commandLine",
    },
    appPages: [
      { pageScriptHash: "page_script_hash", pageName: "streamlit_app" },
    ],
    pageScriptHash: "page_script_hash",
  }
  const NEW_SESSION = new NewSession(NEW_SESSION_JSON)

  afterEach(() => {
    const UnsafeSessionInfo = SessionInfo as any
    UnsafeSessionInfo.singleton = undefined
    window.localStorage.clear()
  })

  it("respects the user's theme preferencece if set, but adds custom theme as an option", () => {
    const props = getProps()
    window.localStorage.setItem(
      LocalStore.ACTIVE_THEME,
      JSON.stringify({ name: lightTheme.name })
    )
    const wrapper = shallow(<App {...props} />)

    // @ts-ignore
    wrapper.instance().handleNewSession(NEW_SESSION)

    // @ts-ignore
    expect(props.theme.addThemes).toHaveBeenCalled()

    // @ts-ignore
    expect(props.theme.setTheme).not.toHaveBeenCalled()
  })

  it("sets the custom theme as the default if no user preference is set", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)

    const newSessionJson = cloneDeep(NEW_SESSION_JSON)

    // @ts-ignore
    wrapper.instance().handleNewSession(new NewSession(newSessionJson))

    // @ts-ignore
    expect(props.theme.addThemes).toHaveBeenCalled()

    // @ts-ignore
    expect(props.theme.setTheme).toHaveBeenCalled()

    // @ts-ignore
    expect(props.theme.setTheme.mock.calls[0][0].name).toBe(CUSTOM_THEME_NAME)
  })

  it("sets the custom theme again if a custom theme is already active", () => {
    window.localStorage.setItem(
      LocalStore.ACTIVE_THEME,
      JSON.stringify({ name: CUSTOM_THEME_NAME, themeInput: {} })
    )
    const props = getProps()
    props.theme.activeTheme = {
      ...lightTheme,
      name: CUSTOM_THEME_NAME,
    }
    const wrapper = shallow(<App {...props} />)

    const newSessionJson = cloneDeep(NEW_SESSION_JSON)

    // @ts-ignore
    wrapper.instance().handleNewSession(new NewSession(newSessionJson))

    // @ts-ignore
    expect(props.theme.addThemes).toHaveBeenCalled()

    // @ts-ignore
    expect(props.theme.setTheme).toHaveBeenCalled()

    // @ts-ignore
    expect(props.theme.setTheme.mock.calls[0][0].name).toBe(CUSTOM_THEME_NAME)
  })

  it("removes the custom theme from theme options if one is not received from the server", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)

    const newSessionJson = cloneDeep(NEW_SESSION_JSON)
    // @ts-ignore
    newSessionJson.customTheme = null

    // @ts-ignore
    wrapper.instance().handleNewSession(new NewSession(newSessionJson))

    // @ts-ignore
    expect(props.theme.addThemes).toHaveBeenCalled()

    // @ts-ignore
    expect(props.theme.addThemes.mock.calls[0][0]).toEqual([])
  })

  it("Does not change dark/light/auto user preferences when removing a custom theme", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)

    const newSessionJson = cloneDeep(NEW_SESSION_JSON)

    // @ts-ignore
    newSessionJson.customTheme = null

    // @ts-ignore
    wrapper.instance().handleNewSession(new NewSession(newSessionJson))

    // @ts-ignore
    expect(props.theme.addThemes).toHaveBeenCalled()

    // @ts-ignore
    expect(props.theme.addThemes.mock.calls[0][0]).toEqual([])

    // @ts-ignore
    expect(props.theme.setTheme).not.toHaveBeenCalled()
  })

  it("Changes theme to auto when user has a custom theme selected and it is removed", () => {
    const props = getProps()
    props.theme.activeTheme = {
      ...lightTheme,
      name: CUSTOM_THEME_NAME,
    }
    const wrapper = shallow(<App {...props} />)

    const newSessionJson = cloneDeep(NEW_SESSION_JSON)
    // @ts-ignore
    newSessionJson.customTheme = null

    // @ts-ignore
    wrapper.instance().handleNewSession(new NewSession(newSessionJson))

    expect(props.theme.addThemes).toHaveBeenCalled()
    // @ts-ignore
    expect(props.theme.addThemes.mock.calls[0][0]).toEqual([])

    expect(props.theme.setTheme).toHaveBeenCalled()
    // @ts-ignore
    expect(props.theme.setTheme.mock.calls[0][0]).toEqual(createAutoTheme())
  })

  it("updates the custom theme if the one received from server has different hash", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)

    const customThemeConfig = new CustomThemeConfig({ primaryColor: "blue" })
    // @ts-ignore
    const themeHash = wrapper.instance().createThemeHash(customThemeConfig)
    wrapper.setState({ themeHash })

    // @ts-ignore
    wrapper.instance().handleNewSession(NEW_SESSION)

    expect(props.theme.addThemes).toHaveBeenCalled()
    expect(props.theme.setTheme).toHaveBeenCalled()
  })

  it("does nothing if the custom theme received from server has a matching hash", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)

    const customThemeConfig = new CustomThemeConfig(
      NEW_SESSION_JSON.customTheme
    )
    // @ts-ignore
    const themeHash = wrapper.instance().createThemeHash(customThemeConfig)
    wrapper.setState({ themeHash })

    // @ts-ignore
    wrapper.instance().handleNewSession(NEW_SESSION)

    expect(props.theme.addThemes).not.toHaveBeenCalled()
    expect(props.theme.setTheme).not.toHaveBeenCalled()
  })

  it("does nothing if no custom theme is received and themeHash is 'hash_for_undefined_custom_theme'", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)
    wrapper.setState({ themeHash: "hash_for_undefined_custom_theme" })

    const newSessionJson = cloneDeep(NEW_SESSION_JSON)
    // @ts-ignore
    newSessionJson.customTheme = null

    // @ts-ignore
    wrapper.instance().handleNewSession(new NewSession(newSessionJson))

    expect(props.theme.addThemes).not.toHaveBeenCalled()
    expect(props.theme.setTheme).not.toHaveBeenCalled()
  })

  it("performs one-time initialization", () => {
    const wrapper = shallow(<App {...getProps()} />)
    const app = wrapper.instance()

    const oneTimeInitialization = jest.spyOn(
      app,
      // @ts-ignore
      "handleOneTimeInitialization"
    )

    expect(SessionInfo.isSet()).toBe(false)

    // @ts-ignore
    app.handleNewSession(NEW_SESSION)

    expect(oneTimeInitialization).toHaveBeenCalledTimes(1)
    expect(SessionInfo.isSet()).toBe(true)
  })

  it("performs one-time initialization only once", () => {
    const wrapper = shallow(<App {...getProps()} />)
    const app = wrapper.instance()

    const oneTimeInitialization = jest.spyOn(
      app,
      // @ts-ignore
      "handleOneTimeInitialization"
    )

    expect(SessionInfo.isSet()).toBe(false)

    // @ts-ignore
    app.handleNewSession(NEW_SESSION)
    // @ts-ignore
    app.handleNewSession(NEW_SESSION)
    // @ts-ignore
    app.handleNewSession(NEW_SESSION)

    // Multiple NEW_SESSION messages should not result in one-time
    // initialization being performed more than once.
    expect(oneTimeInitialization).toHaveBeenCalledTimes(1)
    expect(SessionInfo.isSet()).toBe(true)
  })

  it("performs one-time initialization after a new session is received", () => {
    const wrapper = shallow(<App {...getProps()} />)
    const app = wrapper.instance()

    const oneTimeInitialization = jest.spyOn(
      app,
      // @ts-ignore
      "handleOneTimeInitialization"
    )

    expect(SessionInfo.isSet()).toBe(false)

    // @ts-ignore
    app.handleNewSession(NEW_SESSION)
    expect(oneTimeInitialization).toHaveBeenCalledTimes(1)

    // @ts-ignore
    app.handleConnectionStateChanged(ConnectionState.PINGING_SERVER)
    expect(SessionInfo.isSet()).toBe(false)

    // @ts-ignore
    app.handleConnectionStateChanged(ConnectionState.CONNECTED)
    // @ts-ignore
    app.handleNewSession(NEW_SESSION)

    expect(oneTimeInitialization).toHaveBeenCalledTimes(2)
    expect(SessionInfo.isSet()).toBe(true)
  })

  it("plumbs appPages and currentPageScriptHash to the AppView component", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)

    expect(wrapper.find("AppView").prop("appPages")).toEqual([])

    const appPages = [
      { pageScriptHash: "hash1", pageName: "page1" },
      { pageScriptHash: "hash2", pageName: "page2" },
    ]

    const newSessionJson = cloneDeep(NEW_SESSION_JSON)
    // @ts-ignore
    newSessionJson.appPages = appPages

    // @ts-ignore
    newSessionJson.pageScriptHash = "hash1"

    // @ts-ignore
    wrapper.instance().handleNewSession(new NewSession(newSessionJson))
    expect(wrapper.find("AppView").prop("appPages")).toEqual(appPages)
    expect(wrapper.find("AppView").prop("currentPageScriptHash")).toEqual(
      "hash1"
    )
    expect(document.title).toBe("page1 · Streamlit")
    expect(props.s4aCommunication.sendMessage).toHaveBeenCalledWith({
      type: "SET_APP_PAGES",
      appPages,
    })
    expect(props.s4aCommunication.sendMessage).toHaveBeenCalledWith({
      type: "SET_CURRENT_PAGE_NAME",
      currentPageName: "",
      currentPageScriptHash: "hash1",
    })
  })

  it("calls clearAppState if currentPageScriptHash changes", () => {
    const wrapper = shallow(<App {...getProps()} />)
    const instance = wrapper.instance() as App
    instance.clearAppState = jest.fn()

    const newSessionJson = cloneDeep(NEW_SESSION_JSON)
    // @ts-ignore
    newSessionJson.pageScriptHash = "different_hash"

    // @ts-ignore
    wrapper.instance().handleNewSession(new NewSession(newSessionJson))

    expect(instance.clearAppState).toHaveBeenCalled()
  })

  it("doesn't call clearAppState if currentPageScriptHash doesn't change", () => {
    const wrapper = shallow(<App {...getProps()} />)
    wrapper.setState({
      currentPageScriptHash: "page_script_hash",
      appHash: hashString("installationId"),
    })
    const instance = wrapper.instance() as App
    instance.clearAppState = jest.fn()

    const newSessionJson = cloneDeep(NEW_SESSION_JSON)

    // @ts-ignore
    wrapper.instance().handleNewSession(new NewSession(newSessionJson))

    expect(instance.clearAppState).not.toHaveBeenCalled()
  })

  it("sets hideSidebarNav based on the server config option and s4a setting", () => {
    const wrapper = shallow(<App {...getProps()} />)

    // hideSidebarNav initializes to true.
    expect(wrapper.find("AppView").prop("hideSidebarNav")).toEqual(true)

    // Simulate the server ui.hideSidebarNav config option being false.
    const instance = wrapper.instance() as App
    instance.handleNewSession(new NewSession(NEW_SESSION_JSON))
    expect(wrapper.find("AppView").prop("hideSidebarNav")).toEqual(false)

    // Have s4a override the server config option.
    wrapper.setProps(
      getProps({
        s4aCommunication: getS4ACommunicationProp({
          currentState: getS4ACommunicationState({
            hideSidebarNav: true,
          }),
        }),
      })
    )

    expect(wrapper.find("AppView").prop("hideSidebarNav")).toEqual(true)
  })

  describe("page change URL handling", () => {
    let wrapper: ShallowWrapper
    let instance: App

    beforeEach(() => {
      wrapper = shallow(<App {...getProps()} />)
      instance = wrapper.instance() as App
      // @ts-ignore
      instance.connectionManager.getBaseUriParts = mockGetBaseUriParts()

      window.history.pushState({}, "", "/")
      jest.spyOn(
        window.history,
        // @ts-ignore
        "pushState"
      )
    })

    afterEach(() => {
      window.history.pushState({}, "", "/")
    })

    it("can switch to the main page", () => {
      const instance = wrapper.instance() as App
      instance.handleNewSession(new NewSession(NEW_SESSION_JSON))

      expect(window.history.pushState).toHaveBeenCalledWith({}, "", "/")
    })

    it("can switch to a non-main page", () => {
      const instance = wrapper.instance() as App
      const newSessionJson = cloneDeep(NEW_SESSION_JSON)
      newSessionJson.appPages = [
        { pageScriptHash: "page_script_hash", pageName: "streamlit_app" },
        { pageScriptHash: "hash2", pageName: "page2" },
      ]
      newSessionJson.pageScriptHash = "hash2"

      instance.handleNewSession(new NewSession(newSessionJson))

      expect(window.history.pushState).toHaveBeenLastCalledWith(
        {},
        "",
        "/page2"
      )
    })

    it("retains the query string", () => {
      window.history.pushState({}, "", "/?foo=bar")

      const instance = wrapper.instance() as App
      instance.handleNewSession(new NewSession(NEW_SESSION_JSON))

      expect(window.history.pushState).toHaveBeenLastCalledWith(
        {},
        "",
        "/?foo=bar"
      )
    })

    it("works with baseUrlPaths", () => {
      const instance = wrapper.instance() as App
      // @ts-ignore
      instance.connectionManager.getBaseUriParts = mockGetBaseUriParts("foo")

      const newSessionJson = cloneDeep(NEW_SESSION_JSON)
      newSessionJson.appPages = [
        { pageScriptHash: "page_script_hash", pageName: "streamlit_app" },
        { pageScriptHash: "hash2", pageName: "page2" },
      ]
      newSessionJson.pageScriptHash = "hash2"

      instance.handleNewSession(new NewSession(newSessionJson))

      expect(window.history.pushState).toHaveBeenLastCalledWith(
        {},
        "",
        "/foo/page2"
      )
    })
  })
})

describe("App.handlePageConfigChanged", () => {
  let documentTitle: string

  beforeEach(() => {
    documentTitle = document.title
  })

  afterEach(() => {
    document.title = documentTitle
  })

  it("sets document title when 'PageConfig.title' is set", () => {
    const wrapper = shallow(<App {...getProps()} />)
    const app = wrapper.instance() as App
    app.handlePageConfigChanged(new PageConfig({ title: "Jabberwocky" }))

    expect(document.title).toBe("Jabberwocky")
  })
})

// Using this to test the functionality provided through streamlit.experimental_set_query_params.
// Please see https://github.com/streamlit/streamlit/issues/2887 for more context on this.
describe("App.handlePageInfoChanged", () => {
  // These are used in the context of each of the test cases below.
  // Their values are set in beforeEach().
  let wrapper
  let app: App
  let pushStateSpy: any

  beforeEach(() => {
    window.history.pushState({}, "", "/")

    // Setup wrapper and app and spy on window.history.pushState.
    wrapper = shallow<App>(<App {...getProps()} />)
    app = wrapper.instance()
    pushStateSpy = jest.spyOn(
      window.history,
      // @ts-ignore
      "pushState"
    )
  })

  afterEach(() => {
    // Reset the value of document.location.pathname.
    window.history.pushState({}, "", "/")
  })

  it("does not override the pathname when setting query params", () => {
    const pathname = "/foo/bar/"
    // Set the value of document.location.pathname to pathname.
    window.history.pushState({}, "", pathname)

    const pageInfo = new PageInfo({
      queryString: "flying=spaghetti&monster=omg",
    })
    const expectedUrl = `${pathname}?${pageInfo.queryString}`

    // @ts-ignore
    app.handlePageInfoChanged(pageInfo)

    expect(pushStateSpy).toHaveBeenLastCalledWith({}, "", expectedUrl)
  })

  it("does not override the pathname when resetting query params", () => {
    const pathname = "/foo/bar/"
    // Set the value of document.location.pathname to pathname.
    window.history.pushState({}, "", pathname)

    const pageInfo = new PageInfo({
      queryString: "",
    })

    // @ts-ignore
    app.handlePageInfoChanged(pageInfo)

    expect(pushStateSpy).toHaveBeenLastCalledWith({}, "", pathname)
  })

  it("resets query params as expected when at the root pathname", () => {
    // Note: One would typically set the value of document.location.pathname to '/' here,
    // However, this is already taking place in beforeEach().

    const pageInfo = new PageInfo({
      queryString: "",
    })

    // @ts-ignore
    app.handlePageInfoChanged(pageInfo)

    expect(pushStateSpy).toHaveBeenLastCalledWith({}, "", "/")
  })

  it("sets query params as expected when at the root pathname", () => {
    // Note: One would typically set the value of document.location.pathname to '/' here,
    // However, this is already taking place in beforeEach().

    const pageInfo = new PageInfo({
      queryString: "flying=spaghetti&monster=omg",
    })

    // @ts-ignore
    app.handlePageInfoChanged(pageInfo)

    const expectedUrl = `/?${pageInfo.queryString}`
    expect(pushStateSpy).toHaveBeenLastCalledWith({}, "", expectedUrl)
  })
})

describe("App.sendRerunBackMsg", () => {
  let wrapper: ShallowWrapper
  let instance: App

  beforeEach(() => {
    wrapper = shallow(<App {...getProps()} />)
    instance = wrapper.instance() as App
    // @ts-ignore
    instance.sendBackMsg = jest.fn()
    // @ts-ignore
    instance.connectionManager.getBaseUriParts = mockGetBaseUriParts()
  })

  afterEach(() => {
    window.history.pushState({}, "", "/")
  })

  it("sends the pageScriptHash if one is given", () => {
    instance.sendRerunBackMsg(undefined, "some_page_hash")

    // @ts-ignore
    expect(instance.sendBackMsg).toHaveBeenCalledWith({
      rerunScript: {
        pageScriptHash: "some_page_hash",
        pageName: "",
        queryString: "",
      },
    })
  })

  it("sends the currentPageScriptHash if no pageScriptHash is given", () => {
    wrapper.setState({ currentPageScriptHash: "some_other_page_hash" })
    instance.sendRerunBackMsg()

    // @ts-ignore
    expect(instance.sendBackMsg).toHaveBeenCalledWith({
      rerunScript: {
        pageScriptHash: "some_other_page_hash",
        pageName: "",
        queryString: "",
      },
    })
  })

  it("extracts the pageName as an empty string if we can't get a pageScriptHash (main page)", () => {
    instance.sendRerunBackMsg()

    // @ts-ignore
    expect(instance.sendBackMsg).toHaveBeenCalledWith({
      rerunScript: {
        pageScriptHash: "",
        pageName: "",
        queryString: "",
      },
    })
  })

  it("extracts the pageName as the URL path if we can't get a pageScriptHash (non-main page)", () => {
    window.history.pushState({}, "", "/foo/")
    instance.sendRerunBackMsg()

    // @ts-ignore
    expect(instance.sendBackMsg).toHaveBeenCalledWith({
      rerunScript: {
        pageScriptHash: "",
        pageName: "foo",
        queryString: "",
      },
    })
  })

  it("extracts the pageName as the last part of the URL if we can't get a pageScriptHash and we have a nonempty basePath", () => {
    // @ts-ignore
    instance.connectionManager.getBaseUriParts = mockGetBaseUriParts("foo/bar")

    window.history.pushState({}, "", "/foo/bar/baz")
    instance.sendRerunBackMsg()

    // @ts-ignore
    expect(instance.sendBackMsg).toHaveBeenCalledWith({
      rerunScript: {
        pageScriptHash: "",
        pageName: "baz",
        queryString: "",
      },
    })
  })
})

//   * handlePageNotFound has branching error messages depending on pageName
describe("App.handlePageNotFound", () => {
  it("includes the missing page name in error modal message if available", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)
    wrapper.setState({
      appPages: [{ pageScriptHash: "page_hash", pageName: "streamlit_app" }],
    })
    const instance = wrapper.instance() as App

    // @ts-ignore
    instance.connectionManager.getBaseUriParts = mockGetBaseUriParts()
    instance.showError = jest.fn()

    instance.handlePageNotFound(
      new PageNotFound({ pageName: "nonexistentPage" })
    )

    expect(window.history.pushState).toHaveBeenCalledWith({}, "", "/")
    expect(instance.showError).toHaveBeenCalledWith(
      "Page not found",
      expect.stringMatching("You have requested page /nonexistentPage")
    )
    expect(props.s4aCommunication.sendMessage).toHaveBeenCalledWith({
      type: "SET_CURRENT_PAGE_NAME",
      currentPageName: "",
      currentPageScriptHash: "page_hash",
    })
  })

  it("uses a more generic error message if no page name is available", () => {
    const props = getProps()
    const wrapper = shallow(<App {...props} />)
    wrapper.setState({
      appPages: [{ pageScriptHash: "page_hash", pageName: "streamlit_app" }],
    })
    const instance = wrapper.instance() as App

    // @ts-ignore
    instance.connectionManager.getBaseUriParts = mockGetBaseUriParts()
    instance.showError = jest.fn()

    instance.handlePageNotFound(new PageNotFound({ pageName: "" }))

    expect(window.history.pushState).toHaveBeenCalledWith({}, "", "/")
    expect(instance.showError).toHaveBeenCalledWith(
      "Page not found",
      expect.stringMatching(
        "The page that you have requested does not seem to exist"
      )
    )
    expect(props.s4aCommunication.sendMessage).toHaveBeenCalledWith({
      type: "SET_CURRENT_PAGE_NAME",
      currentPageName: "",
      currentPageScriptHash: "page_hash",
    })
  })
})

describe("Test Main Menu shortcut functionality", () => {
  beforeEach(() => {
    // @ts-ignore
    delete window.location
    // @ts-ignore
    window.location = {
      assign: jest.fn(),
      host: "testing.com",
      href: "testing.com",
    }
  })

  it("Tests dev menu shortcuts cannot be accessed as a viewer", () => {
    const props = getProps({
      s4aCommunication: getS4ACommunicationProp({
        currentState: getS4ACommunicationState({
          isOwner: false,
        }),
        sendMessage: jest.fn(),
      }),
    })
    const wrapper = shallow<App>(<App {...props} />)
    wrapper.instance().openClearCacheDialog = jest.fn()

    // @ts-ignore
    wrapper.instance().keyHandlers.CLEAR_CACHE()

    expect(wrapper.instance().openClearCacheDialog).not.toBeCalled()
  })

  it("Tests dev menu shortcuts can be accessed as a developer", () => {
    const props = getProps()
    const wrapper = shallow<App>(<App {...props} />)
    wrapper.instance().openClearCacheDialog = jest.fn()

    // @ts-ignore
    wrapper.instance().keyHandlers.CLEAR_CACHE()

    expect(wrapper.instance().openClearCacheDialog).toBeCalled()
  })
})
