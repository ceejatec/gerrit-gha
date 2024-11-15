/**
 * Copyright (C) 2024 Couchbase
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
    ChangeData,
    CheckRun,
    ChecksProvider,
    ResponseCode,
    RunStatus,
    CheckResult
} from '@gerritcodereview/typescript-api/checks';

import { PluginApi } from '@gerritcodereview/typescript-api/plugin';

export class ChecksFetcher implements ChecksProvider {
  private plugin: PluginApi;

  constructor(pluginApi: PluginApi) {
    this.plugin = pluginApi;
  }

  async fetch(data: ChangeData) {
    let checkRuns: CheckRun[] = [];
    let checkResults: CheckResult[] = [];
    checkRuns.push({
      patchset: data.patchsetNumber,
      attempt: 1,
      checkName: "my check name",
      checkDescription: "my check description",
      checkLink: "https://google.com/",
      status: RunStatus.RUNNABLE,
      statusLink: "https://microsoft.com/",
      results: checkResults,
    });
    return {
    responseCode: ResponseCode.OK,
      runs: checkRuns,
    };
  }
}
