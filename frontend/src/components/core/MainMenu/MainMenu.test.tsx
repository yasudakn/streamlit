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

import { mount } from "src/lib/test_util"
import { IMenuItem } from "src/hocs/withS4ACommunication/types"

import { GitInfo, IGitInfo } from "src/autogen/proto"
import { IDeployErrorDialog } from "src/components/core/StreamlitDialog/DeployErrorDialogs/types"
import {
  DetachedHead,
  ModuleIsNotAdded,
  NoRepositoryDetected,
  RepoIsAhead,
  UncommittedChanges,
  UntrackedFiles,
} from "src/components/core/StreamlitDialog/DeployErrorDialogs"

import MainMenu, { Props } from "./MainMenu"

const { GitStates } = GitInfo

const getProps = (extend?: Partial<Props>): Props => ({
  aboutCallback: jest.fn(),
  clearCacheCallback: jest.fn(),
  isServerConnected: true,
  quickRerunCallback: jest.fn(),
  s4aMenuItems: [],
  screencastCallback: jest.fn(),
  screenCastState: "",
  sendS4AMessage: jest.fn(),
  settingsCallback: jest.fn(),
  isDeployErrorModalOpen: false,
  showDeployError: jest.fn(),
  loadGitInfo: jest.fn(),
  closeDialog: jest.fn(),
  canDeploy: true,
  menuItems: {},
  s4aIsOwner: false,
  gitInfo: null,
  ...extend,
})

describe("App", () => {
  it("renders without crashing", () => {
    const props = getProps()
    const wrapper = mount(<MainMenu {...props} />)

    expect(wrapper).toBeDefined()
  })

  it("should render s4a menu items", () => {
    const items: IMenuItem[] = [
      {
        type: "separator",
      },
      {
        type: "text",
        label: "View app source",
        key: "source",
      },
      {
        type: "text",
        label: "Report bug with app",
        key: "support",
      },
      {
        type: "separator",
      },
    ]
    const props = getProps({
      s4aMenuItems: items,
    })
    const wrapper = mount(<MainMenu {...props} />)
    const popoverContent = wrapper.find("StatefulPopover").prop("content")

    // @ts-ignore
    const menuWrapper = mount(popoverContent(() => {}))

    // @ts-ignore
    const menuLabels = menuWrapper
      .find("MenuStatefulContainer")
      .at(0)
      .prop("items")
      // @ts-ignore
      .map(item => item.label)
    expect(menuLabels).toEqual([
      "Rerun",
      "Settings",
      "Record a screencast",
      "Report a bug",
      "Get help",
      "View app source",
      "Report bug with app",
      "About",
    ])

    // @ts-ignore
    const devMenuLabels = menuWrapper
      .find("MenuStatefulContainer")
      .at(1)
      .prop("items")
      // @ts-ignore
      .map(item => item.label)
    expect(devMenuLabels).toEqual([
      "Developer options",
      "Clear cache",
      "Streamlit Cloud",
      "Report a Streamlit bug",
      "Visit Streamlit docs",
      "Visit Streamlit forums",
    ])
  })

  it("should render core set of menu elements", () => {
    const props = getProps()
    const wrapper = mount(<MainMenu {...props} />)
    const popoverContent = wrapper.find("StatefulPopover").prop("content")
    // @ts-ignore
    const menuWrapper = mount(popoverContent(() => {}))

    // @ts-ignore
    const menuLabels = menuWrapper
      .find("MenuStatefulContainer")
      .at(0)
      .prop("items")
      // @ts-ignore
      .map(item => item.label)
    expect(menuLabels).toEqual([
      "Rerun",
      "Settings",
      "Record a screencast",
      "Report a bug",
      "Get help",
      "About",
    ])

    // @ts-ignore
    const devMenuLabels = menuWrapper
      .find("MenuStatefulContainer")
      .at(1)
      .prop("items")
      // @ts-ignore
      .map(item => item.label)
    expect(devMenuLabels).toEqual([
      "Developer options",
      "Clear cache",
      "Deploy this app",
      "Streamlit Cloud",
      "Report a Streamlit bug",
      "Visit Streamlit docs",
      "Visit Streamlit forums",
    ])
  })

  it("should render deploy app menu item", () => {
    const props = getProps({ gitInfo: {} })
    const wrapper = mount(<MainMenu {...props} />)
    const popoverContent = wrapper.find("StatefulPopover").prop("content")
    // @ts-ignore
    const menuWrapper = mount(popoverContent(() => {}))

    // @ts-ignore
    const menuLabels = menuWrapper
      .find("MenuStatefulContainer")
      .at(0)
      .prop("items")
      // @ts-ignore
      .map(item => item.label)
    expect(menuLabels).toEqual([
      "Rerun",
      "Settings",
      "Record a screencast",
      "Report a bug",
      "Get help",
      "About",
    ])

    // @ts-ignore
    const devMenuLabels = menuWrapper
      .find("MenuStatefulContainer")
      .at(1)
      .prop("items")
      // @ts-ignore
      .map(item => item.label)
    expect(devMenuLabels).toEqual([
      "Developer options",
      "Clear cache",
      "Deploy this app",
      "Streamlit Cloud",
      "Report a Streamlit bug",
      "Visit Streamlit docs",
      "Visit Streamlit forums",
    ])
  })

  describe("Onclick deploy button", () => {
    function testDeployErrorModal(
      gitInfo: Partial<IGitInfo>,
      dialogComponent: (module: string) => IDeployErrorDialog
    ): void {
      const props = getProps({
        gitInfo,
      })
      const wrapper = mount(<MainMenu {...props} />)
      const popoverContent = wrapper.find("StatefulPopover").prop("content")

      // @ts-ignore
      const menuWrapper = mount(popoverContent(() => {}))
      const items: any = menuWrapper
        .find("StatefulMenu")
        .at(1)
        .prop("items")

      const deployOption = items.find(
        // @ts-ignore
        ({ label }) => label === "Deploy this app"
      )

      deployOption.onClick()

      // @ts-ignore
      const dialog = dialogComponent(props.gitInfo.module)
      // @ts-ignore
      expect(props.showDeployError.mock.calls[0][0]).toStrictEqual(
        dialog.title
      )
      // @ts-ignore
      expect(props.showDeployError.mock.calls[0][1]).toStrictEqual(dialog.body)
    }

    it("should display the correct modal if there is no repo or remote", () => {
      testDeployErrorModal(
        {
          state: GitStates.DEFAULT,
        },
        NoRepositoryDetected
      )
    })

    it("should display the correct modal if there is an empty repo", () => {
      testDeployErrorModal(
        {
          repository: "",
          branch: "",
          module: "",
          state: GitStates.DEFAULT,
        },
        NoRepositoryDetected
      )
    })

    it("should display the correct modal if the repo is detached", () => {
      testDeployErrorModal(
        {
          repository: "repo",
          branch: "branch",
          module: "module",
          state: GitStates.HEAD_DETACHED,
        },
        DetachedHead
      )
    })

    it("should display the correct modal if the script is not added to the repo", () => {
      testDeployErrorModal(
        {
          repository: "repo",
          branch: "branch",
          module: "module.py",
          state: GitStates.DEFAULT,
          untrackedFiles: ["module.py"],
        },
        ModuleIsNotAdded
      )
    })

    it("should display the correct modal if there are uncommitted changes in the repo", () => {
      testDeployErrorModal(
        {
          repository: "repo",
          branch: "branch",
          module: "module.py",
          state: GitStates.DEFAULT,
          uncommittedFiles: ["module.py"],
          untrackedFiles: [],
        },
        UncommittedChanges
      )
    })

    it("should display the correct modal if there are changes not pushed to GitHub", () => {
      const deployParams: IGitInfo = {
        repository: "repo",
        branch: "branch",
        module: "module.py",
        uncommittedFiles: [],
        untrackedFiles: [],
        state: GitStates.AHEAD_OF_REMOTE,
      }
      testDeployErrorModal(deployParams, RepoIsAhead)
    })

    it("should display the correct modal if there are untracked files", () => {
      testDeployErrorModal(
        {
          repository: "repo",
          branch: "branch",
          module: "module.py",
          state: GitStates.DEFAULT,
          untrackedFiles: ["another-file.py"],
        },
        UntrackedFiles
      )
    })
  })

  it("should not render set of configurable elements", () => {
    const menuItems = {
      hideGetHelp: true,
      hideReportABug: true,
      aboutSectionMd: "",
    }
    const props = getProps({ menuItems })
    const wrapper = mount(<MainMenu {...props} />)
    const popoverContent = wrapper.find("StatefulPopover").prop("content")
    // @ts-ignore
    const menuWrapper = mount(popoverContent(() => {}))

    // @ts-ignore
    const menuLabels = menuWrapper
      .find("MenuStatefulContainer")
      .at(0)
      .prop("items")
      // @ts-ignore
      .map(item => item.label)
    expect(menuLabels).toEqual([
      "Rerun",
      "Settings",
      "Record a screencast",
      "About",
    ])
  })

  it("should not render report a bug in core menu", () => {
    const menuItems = {
      getHelpUrl: "testing",
      hideGetHelp: false,
      hideReportABug: true,
      aboutSectionMd: "",
    }
    const props = getProps({ menuItems })
    const wrapper = mount(<MainMenu {...props} />)
    const popoverContent = wrapper.find("StatefulPopover").prop("content")
    // @ts-ignore
    const menuWrapper = mount(popoverContent(() => {}))

    // @ts-ignore
    const menuLabels = menuWrapper
      .find("MenuStatefulContainer")
      .at(0)
      .prop("items")
      // @ts-ignore
      .map(item => item.label)
    expect(menuLabels).toEqual([
      "Rerun",
      "Settings",
      "Record a screencast",
      "Get help",
      "About",
    ])
  })

  it("should not render dev menu when s4aIsOwner is false and not on localhost", () => {
    // set isLocalhost to false by deleting window.location.
    // Source: https://www.benmvp.com/blog/mocking-window-location-methods-jest-jsdom/
    // @ts-ignore
    delete window.location

    // @ts-ignore
    window.location = {
      assign: jest.fn(),
    }
    const props = getProps()
    const wrapper = mount(<MainMenu {...props} />)
    const popoverContent = wrapper.find("StatefulPopover").prop("content")
    // @ts-ignore
    const menuWrapper = mount(popoverContent(() => {}))

    // @ts-ignore
    const menuLabels = menuWrapper
      .find("MenuStatefulContainer")
      // make sure that we only have one menu otherwise prop will fail
      .prop("items")
      // @ts-ignore
      .map(item => item.label)
    expect(menuLabels).toEqual([
      "Rerun",
      "Settings",
      "Record a screencast",
      "Report a bug",
      "Get help",
      "About",
    ])
  })
})
