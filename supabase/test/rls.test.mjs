// Veritabanı güvenlik kuralları (RLS) testleri.
// Gerçek bir Postgres (PGlite) üzerinde, farklı kullanıcı rolleriyle çalışır.
// Çalıştır: npm run test:db

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const db = new PGlite();

await db.exec(readFileSync(join(here, "supabase-stub.sql"), "utf8"));
const schema = readFileSync(join(here, "..", "schema.sql"), "utf8")
  .replaceAll("'ornek@gmail.com'", "'yonetici@ornek.com'")
  .replace("on conflict (email) do nothing;", "on conflict (email) do nothing;\ninsert into public.role_invites values ('jury@ornek.com', 'jury') on conflict do nothing;");
await db.exec(schema);
await db.exec(schema); // tekrar çalıştırılabilir olmalı

const U = {
  admin: "00000000-0000-0000-0000-00000000000a",
  alice: "00000000-0000-0000-0000-0000000000a1",
  bob: "00000000-0000-0000-0000-0000000000b0",
  carol: "00000000-0000-0000-0000-0000000000c0",
  jury: "00000000-0000-0000-0000-0000000000d0",
};

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    process.exitCode = 1;
  }
}

async function as(user, sql, params = []) {
  await db.exec("reset role");
  if (user === "anon") {
    await db.exec("set role anon; select set_config('request.jwt.claim.sub', '', false);");
  } else if (user) {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [U[user]]);
    await db.exec("set role authenticated");
  }
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}
const rows = async (user, sql, params) => (await as(user, sql, params)).rows;
async function fails(user, sql, params) {
  await assert.rejects(() => as(user, sql, params));
}
const superuser = (sql, params) => db.query(sql, params);
const phase = (p) => superuser("update public.settings set phase = $1", [p]);

// --- Kullanıcıları oluştur (trigger profilleri açar)
for (const [k, id] of Object.entries(U)) {
  const email = k === "admin" ? "Yonetici@ornek.com" : `${k}@ornek.com`;
  await superuser(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
    [id, email, JSON.stringify({ full_name: k.toUpperCase(), avatar_url: `https://x/${k}.png` })],
  );
}

const entry = (owner, id, extra = {}) => ({
  id,
  user_id: U[owner],
  title: `${owner} şarkısı`,
  artist_name: owner,
  audio_path: `${U[owner]}/${id}.mp3`,
  cover_path: `${U[owner]}/${id}.jpg`,
  ...extra,
});
const insertEntry = (user, e) =>
  as(user,
    `insert into public.entries (id, user_id, title, artist_name, audio_path, cover_path, status)
     values ($1, $2, $3, $4, $5, $6, coalesce($7, 'submitted'))`,
    [e.id, e.user_id, e.title, e.artist_name, e.audio_path, e.cover_path, e.status ?? null]);
const insertObject = (user, bucket, name) =>
  as(user, "insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, name]);

const E = {
  alice: "10000000-0000-0000-0000-000000000001",
  bob: "10000000-0000-0000-0000-000000000002",
  carol: "10000000-0000-0000-0000-000000000003",
  extra: "10000000-0000-0000-0000-000000000004",
};

console.log("\nProfiller");
await test("yönetici e-postası (büyük/küçük harf duyarsız) ile giren yönetici olur", async () => {
  const r = await rows(null, "select id, role, full_name, avatar_url from public.profiles order by id");
  assert.equal(r.find((x) => x.id === U.admin).role, "admin");
  assert.equal(r.find((x) => x.id === U.alice).role, "user");
  assert.equal(r.find((x) => x.id === U.alice).full_name, "ALICE");
});
await test("kullanıcı yalnızca kendi profilini görür, yönetici hepsini", async () => {
  assert.equal((await rows("alice", "select * from public.profiles")).length, 1);
  assert.equal((await rows("admin", "select * from public.profiles")).length, 5);
  assert.equal((await rows("anon", "select * from public.profiles")).length, 0);
});
await test("kullanıcı kendini yönetici yapamaz", async () => {
  await as("alice", "update public.profiles set role = 'admin' where id = $1", [U.alice]);
  const r = await rows(null, "select role from public.profiles where id = $1", [U.alice]);
  assert.equal(r[0].role, "user");
});
await test("davet edilen jüri ilk girişte jüri rolünü alır", async () => {
  const r = await rows(null, "select role from public.profiles where id = $1", [U.jury]);
  assert.equal(r[0].role, "jury");
});
await test("yönetici rol değiştirebilir ve davet ekleyebilir; kullanıcı ekleyemez", async () => {
  await as("admin", "update public.profiles set role = 'jury' where id = $1", [U.bob]);
  assert.equal((await rows(null, "select role from public.profiles where id = $1", [U.bob]))[0].role, "jury");
  await as("admin", "update public.profiles set role = 'user' where id = $1", [U.bob]);
  await as("admin", "insert into public.role_invites values ('yeni@ornek.com', 'jury')");
  await fails("alice", "insert into public.role_invites values ('alice2@ornek.com', 'admin')");
  assert.equal((await rows("alice", "select * from public.role_invites")).length, 0);
});
await test("site sahibinin yöneticiliğini başka bir yönetici kaldıramaz", async () => {
  await superuser("update public.profiles set role = 'admin' where id = $1", [U.bob]);
  await fails("bob", "update public.profiles set role = 'user' where id = $1", [U.admin]);
  await fails("bob", "update public.role_invites set role = 'jury' where email = 'yonetici@ornek.com'");
  await fails("bob", "delete from public.role_invites where email = 'yonetici@ornek.com'");
  await fails("bob", "insert into public.owners values ('bob@ornek.com')");
  assert.equal((await rows(null, "select role from public.profiles where id = $1", [U.admin]))[0].role, "admin");
  // sahip diğer yöneticiyi çıkarabilir; SQL Editor'den (oturumsuz) her şey değiştirilebilir
  await as("admin", "update public.profiles set role = 'user' where id = $1", [U.bob]);
  assert.equal((await rows(null, "select role from public.profiles where id = $1", [U.bob]))[0].role, "user");
  await superuser("select set_config('request.jwt.claim.sub', '', false)");
  await superuser("update public.profiles set role = 'jury' where id = $1", [U.admin]);
  await superuser("update public.profiles set role = 'admin' where id = $1", [U.admin]);
});

console.log("\nAyarlar");
await test("herkes ayarları okur", async () => {
  assert.equal((await rows("anon", "select title, phase from public.settings"))[0].phase, "submissions");
});
await test("kullanıcı aşamayı değiştiremez, yönetici değiştirir", async () => {
  await as("alice", "update public.settings set phase = 'results'");
  assert.equal((await rows(null, "select phase from public.settings"))[0].phase, "submissions");
  await as("admin", "update public.settings set title = 'Yeni Başlık'");
  assert.equal((await rows(null, "select title from public.settings"))[0].title, "Yeni Başlık");
});

console.log("\nBaşvuru aşaması");
await test("kullanıcı kendi klasörüne dosya yükler", async () => {
  await insertObject("alice", "audio", `${U.alice}/${E.alice}.mp3`);
  await insertObject("alice", "covers", `${U.alice}/${E.alice}.jpg`);
  await insertObject("bob", "audio", `${U.bob}/${E.bob}.mp3`);
  await insertObject("carol", "audio", `${U.carol}/${E.carol}.mp3`);
});
await test("başkasının klasörüne dosya yükleyemez", async () => {
  await fails("alice", "insert into storage.objects (bucket_id, name) values ('audio', $1)", [`${U.bob}/x.mp3`]);
});
await test("girişsiz kullanıcı dosya yükleyemez", async () => {
  await fails("anon", "insert into storage.objects (bucket_id, name) values ('audio', $1)", [`${U.alice}/y.mp3`]);
});
await test("kullanıcı başvuru yapar", async () => {
  await insertEntry("alice", entry("alice", E.alice));
  await insertEntry("bob", entry("bob", E.bob));
  await insertEntry("carol", entry("carol", E.carol));
});
await test("kişi başı başvuru sınırı (varsayılan 1) aşılamaz", async () => {
  await assert.rejects(() => insertEntry("alice", entry("alice", E.extra)));
});
await test("başkası adına ya da başkasının dosyasıyla başvuru yapılamaz", async () => {
  await assert.rejects(() => insertEntry("bob", entry("alice", E.extra)));
  await superuser("update public.settings set max_entries_per_user = 2");
  await assert.rejects(() =>
    insertEntry("bob", entry("bob", E.extra, { audio_path: `${U.alice}/${E.alice}.mp3` })));
  await superuser("update public.settings set max_entries_per_user = 1");
});
await test("başvuru doğrudan finalist olarak eklenemez", async () => {
  await superuser("update public.settings set max_entries_per_user = 2");
  await assert.rejects(() => insertEntry("bob", entry("bob", E.extra, { status: "finalist" })));
  await superuser("update public.settings set max_entries_per_user = 1");
});
await test("kullanıcı yalnızca kendi başvurusunu görür; jüri ve yönetici hepsini", async () => {
  assert.equal((await rows("alice", "select id from public.entries")).length, 1);
  assert.equal((await rows("anon", "select id from public.entries")).length, 0);
  assert.equal((await rows("jury", "select id from public.entries")).length, 3);
  assert.equal((await rows("admin", "select id from public.entries")).length, 3);
});
await test("kullanıcı kendini finalist yapamaz", async () => {
  await as("alice", "update public.entries set status = 'finalist' where id = $1", [E.alice]);
  assert.equal((await rows(null, "select status from public.entries where id = $1", [E.alice]))[0].status, "submitted");
});
await test("ses dosyaları gizli: sahibi ve jüri görür, başkası görmez", async () => {
  assert.equal((await rows("alice", "select name from storage.objects where bucket_id = 'audio'")).length, 1);
  assert.equal((await rows("bob", "select name from storage.objects where bucket_id = 'audio' and name like $1", [`${U.alice}/%`])).length, 0);
  assert.equal((await rows("anon", "select name from storage.objects where bucket_id = 'audio'")).length, 0);
  assert.equal((await rows("jury", "select name from storage.objects where bucket_id = 'audio'")).length, 3);
});
await test("başvuru aşamasında oy verilemez", async () => {
  await fails("bob", "insert into public.votes (user_id, entry_id) values ($1, $2)", [U.bob, E.alice]);
});

const C = (await superuser("select id from public.criteria order by sort_order")).rows.map((r) => String(r.id));
const scoresJson = (values) => JSON.stringify(Object.fromEntries(C.map((id, i) => [id, values[i]])));
const save = (user, entryId, values, note = null) =>
  as(user, "select public.jury_save($1, $2::jsonb, $3)", [entryId, scoresJson(values), note]);

await test("değerlendirme aşaması başlamadan jüri puan veremez", async () => {
  await assert.rejects(() => save("jury", E.alice, [8, 8, 8, 8, 8]), /değerlendirmesi aşamasında/);
});

console.log("\nDeğerlendirme aşaması");
await phase("review");
await test("başvurular kapanır: yeni başvuru ve dosya yüklenemez", async () => {
  await superuser("update public.settings set max_entries_per_user = 2");
  await assert.rejects(() => insertEntry("bob", entry("bob", E.extra)));
  await fails("bob", "insert into storage.objects (bucket_id, name) values ('audio', $1)", [`${U.bob}/z.mp3`]);
  await superuser("update public.settings set max_entries_per_user = 1");
});
await test("değerlendirme sırasında başvuru geri çekilemez", async () => {
  await as("carol", "delete from public.entries where id = $1", [E.carol]);
  assert.equal((await rows(null, "select id from public.entries where id = $1", [E.carol])).length, 1);
});
console.log("\nJüri puanlaması");
await test("varsayılan 5 kriter var; herkes görebilir", async () => {
  assert.equal(C.length, 5);
  assert.equal((await rows("anon", "select id from public.criteria")).length, 5);
});
await test("jüri puan ve not kaydeder, sonra değiştirir", async () => {
  await save("jury", E.alice, [8, 8, 8, 8, 8], "Nakarat çok güçlü");
  await save("jury", E.alice, [9, 8, 8, 8, 8], "Nakarat çok güçlü");
  const r = await rows("jury", "select criterion_id::text, score from public.scores where entry_id = $1 order by criterion_id", [E.alice]);
  assert.equal(r.length, 5);
  assert.equal(r[0].score, 9);
  const n = await rows("jury", "select note from public.judge_notes where entry_id = $1", [E.alice]);
  assert.equal(n[0].note, "Nakarat çok güçlü");
});
await test("boş not kaydedilince not silinir", async () => {
  await save("jury", E.bob, [5, 5, 5, 5, 5], "geçici");
  await save("jury", E.bob, [5, 5, 5, 5, 5], "  ");
  assert.equal((await rows("jury", "select * from public.judge_notes where entry_id = $1", [E.bob])).length, 0);
});
await test("yönetici de jüri gibi puan verebilir", async () => {
  await save("admin", E.alice, [6, 6, 6, 6, 10]);
});
await test("katılımcı puan veremez", async () => {
  await assert.rejects(() => save("alice", E.bob, [10, 10, 10, 10, 10]), /jüri üyesi/);
});
await test("1–10 dışı, küsuratlı puan ve geçersiz kriter reddedilir", async () => {
  await assert.rejects(() => save("jury", E.carol, [11, 5, 5, 5, 5]), /1 ile 10/);
  await assert.rejects(() => save("jury", E.carol, [0, 5, 5, 5, 5]), /1 ile 10/);
  await assert.rejects(() => save("jury", E.carol, [7.5, 5, 5, 5, 5]), /1 ile 10/);
  await assert.rejects(
    () => as("jury", "select public.jury_save($1, '{\"999999\": 5}'::jsonb)", [E.carol]),
    /Geçersiz kriter/,
  );
});
await test("jüri kendi şarkısını puanlayamaz", async () => {
  const own = "10000000-0000-0000-0000-0000000000f1";
  await superuser(
    "insert into public.entries (id, user_id, title, artist_name, audio_path, cover_path) values ($1, $2, 'x', 'x', 'x', 'x')",
    [own, U.jury]);
  await assert.rejects(() => save("jury", own, [5, 5, 5, 5, 5]), /Kendi şarkını/);
  await superuser("delete from public.entries where id = $1", [own]);
});
await test("puanlar doğrudan tabloya yazılamaz", async () => {
  await fails("jury", "insert into public.scores (entry_id, judge_id, criterion_id, score) values ($1, $2, $3, 10)",
    [E.carol, U.jury, C[0]]);
  await fails("jury", "update public.scores set score = 10");
});
await test("jüri yalnızca kendi puanlarını görür, yönetici hepsini", async () => {
  const mine = await rows("jury", "select distinct judge_id from public.scores");
  assert.deepEqual(mine.map((x) => x.judge_id), [U.jury]);
  const all = await rows("admin", "select distinct judge_id from public.scores order by judge_id");
  assert.equal(all.length, 2);
  assert.equal((await rows("alice", "select * from public.scores")).length, 0);
});
await test("ağırlıklı jüri ortalamasını yalnızca yönetici görür", async () => {
  await assert.rejects(() => as("jury", "select * from public.jury_results()"), /yöneticiler/);
  await assert.rejects(() => as("anon", "select * from public.jury_results()"));
  const r = await rows("admin", "select entry_id, judges, score::float as score from public.jury_results()");
  const alice = r.find((x) => x.entry_id === E.alice);
  // Jüri: (9+8+8+8 + 8*0,5) / 4,5 = 8,222 · Yönetici: (6*4 + 10*0,5) / 4,5 = 6,444 → ortalama 7,33
  assert.equal(alice.judges, 2);
  assert.equal(alice.score, 7.33);
  assert.equal(r.find((x) => x.entry_id === E.bob).score, 5);
});
await test("yönetici jüri ilerlemesini görür", async () => {
  const r = await rows("admin", "select email, completed from public.jury_progress()");
  assert.equal(r.find((x) => x.email === "jury@ornek.com").completed, 2);
  assert.equal(r.find((x) => x.email === "yonetici@ornek.com").completed, 1);
  await assert.rejects(() => as("jury", "select * from public.jury_progress()"), /yöneticiler/);
});

await test("yönetici finalistleri işaretler", async () => {
  await as("admin", "update public.entries set status = 'finalist' where id = any($1)", [[E.alice, E.bob]]);
  const r = await rows(null, "select count(*)::int as n from public.entries where status = 'finalist'");
  assert.equal(r[0].n, 2);
});
await test("oylama başlamadan finalistler herkese açık değildir", async () => {
  assert.equal((await rows("anon", "select id from public.entries")).length, 0);
});

console.log("\nOylama aşaması");
await phase("voting");
await test("finalistler herkese açılır, diğer başvurular gizli kalır", async () => {
  const r = await rows("anon", "select id from public.entries order by id");
  assert.deepEqual(r.map((x) => x.id), [E.alice, E.bob]);
});
await test("finalistlerin ses dosyası herkese açılır, diğerleri gizli", async () => {
  const r = await rows("anon", "select name from storage.objects where bucket_id = 'audio' order by name");
  assert.deepEqual(r.map((x) => x.name).sort(), [`${U.alice}/${E.alice}.mp3`, `${U.bob}/${E.bob}.mp3`].sort());
});
await test("oylama başlayınca jüri puanları değiştirilemez", async () => {
  await assert.rejects(() => save("jury", E.alice, [1, 1, 1, 1, 1]), /değerlendirmesi aşamasında/);
});
await test("girişsiz kullanıcı oy veremez", async () => {
  await fails("anon", "insert into public.votes (user_id, entry_id) values ($1, $2)", [U.carol, E.alice]);
});
await test("kullanıcı bir finaliste oy verir", async () => {
  await as("carol", "insert into public.votes (user_id, entry_id) values ($1, $2)", [U.carol, E.alice]);
});
await test("ikinci oy verilemez (kişi başı tek oy)", async () => {
  await fails("carol", "insert into public.votes (user_id, entry_id) values ($1, $2)", [U.carol, E.bob]);
});
await test("oy değiştirilebilir", async () => {
  await as("carol", "update public.votes set entry_id = $2, updated_at = now() where user_id = $1", [U.carol, E.bob]);
  assert.equal((await rows(null, "select entry_id from public.votes where user_id = $1", [U.carol]))[0].entry_id, E.bob);
});
await test("finalist olmayan başvuruya oy verilemez", async () => {
  await fails("alice", "insert into public.votes (user_id, entry_id) values ($1, $2)", [U.alice, E.carol]);
});
await test("başkası adına oy verilemez", async () => {
  await fails("alice", "insert into public.votes (user_id, entry_id) values ($1, $2)", [U.bob, E.alice]);
});
await test("upsert ile oy verme/değiştirme çalışır", async () => {
  const sql = `insert into public.votes (user_id, entry_id) values ($1, $2)
               on conflict (user_id) do update set entry_id = excluded.entry_id, updated_at = now()`;
  await as("alice", sql, [U.alice, E.bob]);
  await as("alice", sql, [U.alice, E.alice]);
  assert.equal((await rows(null, "select entry_id from public.votes where user_id = $1", [U.alice]))[0].entry_id, E.alice);
});
await test("kullanıcı başkalarının oyunu göremez", async () => {
  assert.equal((await rows("alice", "select * from public.votes")).length, 1);
});
await test("oylama sürerken sonuçları yalnızca yönetici görür", async () => {
  assert.equal((await rows("carol", "select * from public.vote_results()")).length, 0);
  assert.equal((await rows("anon", "select * from public.vote_results()")).length, 0);
  const r = await rows("admin", "select entry_id, votes::int from public.vote_results()");
  assert.equal(r.find((x) => x.entry_id === E.bob).votes, 1);
  assert.equal(r.find((x) => x.entry_id === E.alice).votes, 1);
});

console.log("\nSonuç aşaması");
await phase("results");
await test("sonuçlar herkese açılır", async () => {
  const r = await rows("anon", "select entry_id, votes::int from public.vote_results()");
  assert.equal(r.length, 2);
});
await test("oylama kapanınca oy verilemez veya değiştirilemez", async () => {
  await fails("bob", "insert into public.votes (user_id, entry_id) values ($1, $2)", [U.bob, E.alice]);
  await as("carol", "update public.votes set entry_id = $2 where user_id = $1", [U.carol, E.alice]);
  assert.equal((await rows(null, "select entry_id from public.votes where user_id = $1", [U.carol]))[0].entry_id, E.bob);
});

console.log(`\n${passed} test geçti${process.exitCode ? ", hata var!" : "."}`);
