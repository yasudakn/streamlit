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

import os
import sys
from pathlib import Path

import setuptools
from setuptools.command.install import install

THIS_DIRECTORY = Path(__file__).parent

VERSION = "1.23.1"  # PEP-440

NAME = "streamlit"

# IMPORTANT: We should try very hard *not* to add dependencies to Streamlit.
# And if you do add one, make the required version as general as possible:
# - Include relevant lower bound for any features we use from our dependencies
# - And include an upper bound that's < NEXT_MAJOR_VERSION
INSTALL_REQUIRES = [
    "altair>=4.0, <6",
    "blinker>=1.0.0, <2",
    "cachetools>=4.0, <6",
    "click>=7.0, <9",
    # 1.4 introduced the functionality found in python 3.8's importlib.metadata module
    "importlib-metadata>=1.4, <7",
    "numpy>=1, <2",
    "packaging>=14.1, <24",
    "pandas>=0.25, <3",
    "pillow>=6.2.0, <10",
    # Python protobuf 4.21 (the first 4.x version) is compatible with protobufs
    # generated from `protoc` >= 3.20. (`protoc` is installed separately from the Python
    # protobuf package, so this pin doesn't actually enforce a `protoc` minimum version.
    # Instead, the `protoc` min version is enforced in our Makefile.)
    "protobuf>=3.20, <5",
    # pyarrow is not semantically versioned, gets new major versions frequently, and
    # doesn't tend to break the API on major version upgrades, so we don't put an
    # upper bound on it.
    "pyarrow>=4.0",
    "pympler>=0.9, <2",
    "python-dateutil>=2, <3",
    "requests>=2.4, <3",
    "rich>=10.11.0, <14",
    "tenacity>=8.0.0, <9",
    "toml<2",
    "typing-extensions>=4.0.1, <5",
    "tzlocal>=1.1, <5",
    "validators>=0.2, <1",
    # Don't require watchdog on MacOS, since it'll fail without xcode tools.
    # Without watchdog, we fallback to a polling file watcher to check for app changes.
    "watchdog; platform_system != 'Darwin'",
]

# We want to exclude some dependencies in our internal Snowpark conda distribution of
# Streamlit. These dependencies will be installed normally for both regular conda builds
# and PyPI builds (that is, for people installing streamlit using either
# `pip install streamlit` or `conda install -c conda-forge streamlit`)
SNOWPARK_CONDA_EXCLUDED_DEPENDENCIES = [
    "gitpython>=3, <4, !=3.1.19",
    "pydeck>=0.1.dev5, <1",
    # Tornado 6.0.3 was the current Tornado version when Python 3.8, our earliest supported Python version,
    # was released (Oct 14, 2019).
    "tornado>=6.0.3, <7",
]

if not os.getenv("SNOWPARK_CONDA_BUILD"):
    INSTALL_REQUIRES.extend(SNOWPARK_CONDA_EXCLUDED_DEPENDENCIES)

EXTRA_REQUIRES = {"snowflake": ["snowflake-snowpark-python; python_version=='3.8'"]}


class VerifyVersionCommand(install):
    """Custom command to verify that the git tag matches our version"""

    description = "verify that the git tag matches our version"

    def run(self):
        tag = os.getenv("TAG")

        if tag != VERSION:
            info = "Git tag: {0} does not match the version of this app: {1}".format(
                tag, VERSION
            )
            sys.exit(info)


readme_path = THIS_DIRECTORY / ".." / "README.md"
if readme_path.exists():
    long_description = readme_path.read_text()
else:
    # In some build environments (specifically in conda), we may not have the README file
    # readily available. In these cases, just let long_description be the empty string.
    # Note that long_description isn't used at all in these build environments, so it
    # being missing isn't problematic.
    long_description = ""

setuptools.setup(
    name=NAME,
    version=VERSION,
    description="A faster way to build and share data apps",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://streamlit.io",
    project_urls={
        "Source Code": "https://github.com/streamlit/streamlit",
        "Bug Tracker": "https://github.com/streamlit/streamlit/issues",
        "Release notes": "https://docs.streamlit.io/library/changelog",
        "Documentation": "https://docs.streamlit.io/",
        "Community": "https://discuss.streamlit.io/",
        "Twitter": "https://twitter.com/streamlit",
    },
    author="Snowflake Inc",
    author_email="hello@streamlit.io",
    license="Apache License 2.0",
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Environment :: Console",
        "Environment :: Web Environment",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Database :: Front-Ends",
        "Topic :: Office/Business :: Financial :: Spreadsheet",
        "Topic :: Scientific/Engineering :: Information Analysis",
        "Topic :: Scientific/Engineering :: Visualization",
        "Topic :: Software Development :: Libraries :: Application Frameworks",
        "Topic :: Software Development :: Widget Sets",
    ],
    # We exclude Python 3.9.7 from our compatible versions due to a bug in that version
    # with typing.Protocol. See https://github.com/streamlit/streamlit/issues/5140 and
    # https://bugs.python.org/issue45121
    python_requires=">=3.8, !=3.9.7",
    # PEP 561: https://mypy.readthedocs.io/en/stable/installed_packages.html
    package_data={"streamlit": ["py.typed", "hello/**/*.py"]},
    packages=setuptools.find_packages(exclude=["tests", "tests.*"]),
    # Requirements
    install_requires=INSTALL_REQUIRES,
    extras_require=EXTRA_REQUIRES,
    zip_safe=False,  # install source files not egg
    include_package_data=True,  # copy html and friends
    entry_points={"console_scripts": ["streamlit = streamlit.web.cli:main"]},
    # For Windows so that streamlit * commands work ie.
    # - streamlit version
    # - streamlit hello
    scripts=["bin/streamlit.cmd"],
    cmdclass={
        "verify": VerifyVersionCommand,
    },
)
