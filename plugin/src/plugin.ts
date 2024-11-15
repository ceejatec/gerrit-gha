import '@gerritcodereview/typescript-api/gerrit';
import {ChecksFetcher} from './fetcher';

window.Gerrit.install(plugin => {
  const checksApi = plugin.checks();
  const fetcher = new ChecksFetcher(plugin);
  checksApi.register({
    fetch: data => fetcher.fetch(data),
  });
});
