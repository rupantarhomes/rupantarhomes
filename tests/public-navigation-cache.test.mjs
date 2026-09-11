import assert from 'node:assert/strict';
import test from 'node:test';
import { dataFixture, deferred, flush, siteFixture } from './helpers/public-navigation-harness.mjs';
const work = (id, category = 'interior') => ({ id, slug: id, title: id, category, featured: true, images: [] });
const blog = (id) => ({ id, slug: id, title: id, body: id, category: 'interior-design' });
const content = (works) => ({ works, reviews: [], settings: {} });
const fixture = () => {
  const requests = [];
  const repository = Object.fromEntries(['loadPublicContent', 'loadPublicWorksPage', 'loadPublicWorkBySlug', 'loadPublicBlogs', 'loadPublicBlogBySlug'].map(name => [name, (...args) => {
    const request = { name, args, ...deferred() }; requests.push(request); return request.promise;
  }]));
  return { repository, requests, named: (name) => requests.filter(r => r.name === name) };
};

test('public reads deduplicate before completion, stay fresh for 30 seconds, and retain stale snapshots during failures', async () => {
  let now = 100;
  const { repository, requests } = fixture();
  const data = dataFixture(repository, () => now);
  const one = data.loadPublicWorksPage(0, 12, 'interior');
  assert.equal(one, data.loadPublicWorksPage(0, 12, 'interior'));
  await flush(); assert.equal(requests.length, 1);
  const result = { works: [work('a')], total: 1 };
  requests[0].resolve(result); await one;
  assert.equal(data.peekPublicWork('interior', 'a'), result.works[0]);
  await data.loadPublicWorksPage(0, 12, 'interior'); assert.equal(requests.length, 1);
  now += data.publicFreshnessMs;
  const refresh = data.loadPublicWorksPage(0, 12, 'interior');
  assert.equal(data.peekPublicWorksPage(0, 'interior'), result);
  await flush(); requests[1].reject(Error('offline')); await assert.rejects(refresh, /offline/);
  assert.equal(data.peekPublicWorksPage(0, 'interior'), result);
  const retry = data.loadPublicWorksPage(0, 12, 'interior'); await flush();
  requests[2].resolve(result); await retry;
});

test('invalidation rejects old reads and cannot erase a newer in-flight request', async () => {
  const { repository, requests } = fixture();
  const data = dataFixture(repository);
  const old = data.loadPublicWorkBySlug('interior', 'a'); await flush();
  data.invalidatePublicWorks();
  const next = data.loadPublicWorkBySlug('interior', 'a'); await flush();
  requests[0].resolve(work('old')); await assert.rejects(old, { name: 'AbortError' });
  assert.equal(data.loadPublicWorkBySlug('interior', 'a'), next);
  requests[1].resolve(work('a')); await next;
  assert.equal(data.peekPublicWork('interior', 'a').id, 'a');
});

test('an older list cannot replace newer detail data; a newer list can satisfy an obsolete detail', async () => {
  const { repository, requests } = fixture();
  const data = dataFixture(repository);
  const list = data.loadPublicWorksPage(); await flush();
  const detail = data.loadPublicWorkBySlug('interior', 'a'); await flush();
  requests[1].resolve({ ...work('a'), title: 'new' }); await detail;
  requests[0].resolve({ works: [{ ...work('a'), title: 'old' }], total: 1 }); await list;
  assert.equal(data.peekPublicWork('interior', 'a').title, 'new');
  data.invalidatePublicWorks();
  const early = data.loadPublicWorkBySlug('interior', 'a'); await flush();
  const later = data.loadPublicWorksPage(); await flush();
  requests[3].resolve({ works: [{ ...work('a'), title: 'latest' }], total: 1 }); await later;
  requests[2].resolve(work('a')); assert.equal((await early).title, 'latest');
});

test('Home content and project story seed details; Admin reads bypass public page cache', async () => {
  const { repository, requests } = fixture(); const data = dataFixture(repository);
  const home = data.loadPublicContent(); assert.equal(home, data.loadPublicContent()); await flush();
  requests[0].resolve(content([work('a')])); await home;
  assert.equal((await data.loadPublicWorkBySlug('interior', 'a')).id, 'a');
  const story = data.loadPublicBlogBySlug('story'); await flush(); requests[1].resolve(blog('story')); await story;
  assert.equal((await data.loadPublicBlogBySlug('story')).id, 'story');
  const admin1 = data.loadPublicWorksPage(0, 1000, 'all');
  const admin2 = data.loadPublicWorksPage(0, 1000, 'all');
  assert.equal(requests.length, 4);
  requests[2].resolve({ works: [], total: 0 }); requests[3].resolve({ works: [], total: 0 });
  await Promise.all([admin1, admin2]);
});

test('production cold Home never uses demo Works and restores confirmed content before revalidation completes', async () => {
  let now = 0; const { repository, requests } = fixture(); const site = siteFixture(repository, { now: () => now });
  site.mount(); assert.deepEqual(site.render().works, []);
  await flush(); requests[0].resolve(content([work('a')])); await flush();
  site.render().openWork('a'); assert.equal(site.render().page, 'work-detail');
  now += 30_000;
  site.render().navigate('home');
  assert.equal(site.render().page, 'home'); assert.equal(site.render().works[0].id, 'a');
  assert.equal(site.render().worksLoading, false);
  await flush(); assert.equal(requests.length, 2);
  requests[1].resolve(content([work('b')])); await flush(); assert.equal(site.render().works[0].id, 'b');
});

test('Works → Home → Works preserves page data and makes no repeat fresh reads', async () => {
  const { repository, requests } = fixture(); const site = siteFixture(repository);
  site.mount(); await flush(); requests[0].resolve(content([work('a')])); await flush();
  site.render().navigate('works'); assert.equal(site.render().page, 'works');
  await flush(); requests[1].resolve({ works: [work('a'), work('b')], total: 2 }); await flush();
  site.render().navigate('home'); site.render().navigate('works');
  assert.deepEqual(site.render().works.map(w => w.id), ['a', 'b']); assert.equal(site.render().worksLoading, false);
  await flush(); assert.equal(requests.length, 2);
});

test('a pending category cannot overwrite Home or a newer category; repeated category reads deduplicate', async () => {
  const { repository, requests } = fixture(); const site = siteFixture(repository);
  site.mount(); await flush(); requests[0].resolve(content([work('home')])); await flush();
  site.render().openCategory('architecture'); site.render().openCategory('architecture'); await flush();
  assert.equal(requests.length, 2);
  site.render().navigate('home'); requests[1].resolve({ works: [work('category', 'architecture')], total: 1 }); await flush();
  assert.equal(site.render().works[0].id, 'home');
  site.render().openCategory('tv-cabinet'); await flush();
  site.render().openCategory('modular-kitchen'); await flush();
  requests[3].resolve({ works: [work('kitchen', 'modular-kitchen')], total: 1 }); await flush();
  requests[2].resolve({ works: [work('tv', 'tv-cabinet')], total: 1 }); await flush();
  assert.equal(site.render().works[0].id, 'kitchen'); assert.equal(site.render().filter, 'modular-kitchen');
});

test('history restores Work records outside the current Home list and preserves Back/Forward routes', async () => {
  const { repository, requests } = fixture(); const site = siteFixture(repository);
  site.mount(); await flush(); requests[0].resolve(content([work('home')])); await flush();
  site.render().navigate('works'); await flush(); requests[1].resolve({ works: [work('other')], total: 1 }); await flush();
  site.render().openWork('other'); site.render().navigate('home');
  await site.back(); assert.equal(site.render().page, 'work-detail'); assert.equal(site.render().selectedWork.id, 'other');
  await site.back(); assert.equal(site.render().page, 'works');
  await site.forward(); assert.equal(site.render().selectedWork.id, 'other');
  await site.forward(); assert.equal(site.render().page, 'home');
  assert.equal(requests.length, 2);
});

test('cold detail history clears the previous record immediately and ignores out-of-order completion', async () => {
  const { repository, requests } = fixture(); const site = siteFixture(repository);
  site.mount(); await flush(); requests[0].resolve(content([work('a')])); await flush(); site.render().openWork('a');
  const old = site.pop('/works/interior/b');
  assert.equal(site.render().page, 'work-detail'); assert.equal(site.render().selectedWork, null);
  await flush(); const next = site.pop('/works/interior/c'); await flush();
  requests[2].resolve(work('c')); await next;
  requests[1].resolve(work('b')); await old;
  assert.equal(site.render().selectedWork.id, 'c');
});

test('Blog reads survive Post navigation; Blog/Post/Home/history reuse confirmed articles', async () => {
  const { repository, requests } = fixture(); const site = siteFixture(repository);
  site.mount(); await flush(); requests[0].resolve(content([work('a')])); await flush();
  site.render().navigate('blog'); site.render().navigate('blog'); await flush();
  assert.equal(requests.length, 2); requests[1].resolve([blog('post')]); await flush();
  site.render().openBlog('post'); assert.equal(site.render().page, 'blog-detail');
  site.render().navigate('blog'); assert.equal(site.render().blogsLoading, false);
  site.render().openBlog('post'); site.render().navigate('home'); await site.back();
  assert.equal(site.render().selectedBlog.id, 'post'); assert.equal(requests.length, 2);
});

test('cold route startup and rapid Home navigation share one shell request', async () => {
  const { repository, requests } = fixture(); const site = siteFixture(repository, { path: '/works/interior/one' });
  site.mount(); site.render().navigate('home'); await flush();
  assert.equal(requests.filter(r => r.name === 'loadPublicContent').length, 1);
  requests.find(r => r.name === 'loadPublicContent').resolve(content([work('home')]));
  requests.find(r => r.name === 'loadPublicWorkBySlug').resolve(work('one')); await flush();
  assert.equal(site.render().page, 'home'); assert.equal(site.render().works[0].id, 'home');
});

test('stale paginated revalidation replaces the old page without duplicating its records', async () => {
  let now = 0; const { repository, requests } = fixture(); const site = siteFixture(repository, { now: () => now });
  const first = site.render().loadWorks('all', 0); await flush();
  requests[0].resolve({ works: Array.from({length:12}, (_,i)=>work(String(i))), total: 14 }); await first;
  const second = site.render().loadWorks('all', 12); await flush();
  requests[1].resolve({ works: [work('12'), work('13')], total: 14 }); await second;
  now = 30_000;
  const refresh = site.render().loadWorks('all', 12);
  assert.equal(site.render().works.length, 14); assert.equal(site.render().worksLoading, false);
  await flush(); requests[2].resolve({ works: [work('12'), work('13')], total: 14 }); await refresh;
  assert.equal(site.render().works.length, 14);
});

test('cached detail remains visible when background revalidation fails', async () => {
  let now = 0; const { repository, requests } = fixture(); const site = siteFixture(repository, { now: () => now });
  site.mount(); await flush(); requests[0].resolve(content([work('a')])); await flush();
  now = 30_000;
  const pending = site.pop('/works/interior/a');
  assert.equal(site.render().selectedWork.id, 'a');
  await flush(); requests[1].reject(Error('offline')); await pending;
  assert.equal(site.render().selectedWork.id, 'a'); assert.equal(site.render().detailLoadError, '');
});

test('Blog history clears an unrelated prior article while a cold article is pending', async () => {
  const { repository, requests } = fixture(); const site = siteFixture(repository);
  const first = site.pop('/blog/first'); await flush(); requests[0].resolve(blog('first')); await first;
  const second = site.pop('/blog/second');
  assert.equal(site.render().page, 'blog-detail'); assert.equal(site.render().selectedBlog, null);
  await flush(); site.render().navigate('home'); await flush();
  requests[1].resolve(blog('second')); await second;
  requests[2].resolve(content([])); await flush(); assert.equal(site.render().page, 'home');
});

test('Blog project-link lookups share requests and are invalidated by Work changes', async () => {
  let calls = 0;
  const data = dataFixture({ loadLinkedWorkForBlog: async () => { calls++; return work('linked'); } });
  await Promise.all([data.loadLinkedWorkForBlog('post'), data.loadLinkedWorkForBlog('post')]);
  assert.equal(calls, 1); assert.equal(data.peekLinkedWorkForBlog('post').id, 'linked');
  await data.loadLinkedWorkForBlog('post'); assert.equal(calls, 1);
  data.invalidatePublicWorks(); assert.equal(data.peekLinkedWorkForBlog('post'), undefined);
  await data.loadLinkedWorkForBlog('post'); assert.equal(calls, 2);
});
