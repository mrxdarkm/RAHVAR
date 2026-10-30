import assert from "node:assert/strict";
import test from "node:test";
import {
  PERSONAL_LETTERS,
  normalizePhone,
  resolvePlate,
} from "../public/plates.js";

test("reads a Tehran plate and names the city", () => {
  const result = resolvePlate("۱۲ ب ۳۴۵ ایران ۱۱");
  assert.equal(result.ok, true);
  assert.equal(result.kind, "city");
  assert.deepEqual(result.cities, ["تهران"]);
  assert.equal(result.sms, "پلاک ۱۲ ب ۳۴۵ ایران ۱۱ از شهر تهران است.");
});

test("accepts latin digits, dashes, and the ایران-first order", () => {
  assert.deepEqual(resolvePlate("12-ب-345-11").cities, ["تهران"]);
  assert.deepEqual(resolvePlate("ایران ۱۱ ۱۲ ب ۳۴۵").cities, ["تهران"]);
  assert.equal(resolvePlate({ left: "22", letter: "د", mid: "117", region: "78" }).cities[0], "شهریار");
});

test("government letter الف still resolves the city", () => {
  const result = resolvePlate("12الف34511");
  assert.equal(result.ok, true);
  assert.equal(result.usage, "دولتی");
  assert.deepEqual(result.cities, ["تهران"]);
  assert.match(result.sms, /نوع: دولتی/);
});

test("taxi on a single-city code names the city and the plate type", () => {
  const result = resolvePlate("12 ت 345 11");
  assert.equal(result.usage, "تاکسی");
  assert.deepEqual(result.cities, ["تهران"]);
  assert.equal(result.tone, "yellow");
});

test("Mashhad, Karaj, Qom, and Shahriar", () => {
  assert.deepEqual(resolvePlate("11 ی 456 ایران 12").cities, ["مشهد"]);
  assert.equal(resolvePlate("68 ب 220 ایران 68").provinces[0], "البرز");
  assert.deepEqual(resolvePlate("68 ب 220 ایران 68").cities, ["کرج"]);
  assert.deepEqual(resolvePlate("44 ژ 100 ایران 16").cities, ["قم"]);
  assert.deepEqual(resolvePlate("22 د 117 ایران 78").cities, ["شهریار"]);
  assert.deepEqual(resolvePlate("22 د 117 ایران 78").nearby, ["ملارد", "قدس"]);
});

test("shared codes stay shared", () => {
  const alborz = resolvePlate("21 ب 100 ایران 38");
  assert.equal(alborz.kind, "shared");
  assert.deepEqual(alborz.cities, ["کرج", "ساوجبلاغ"]);
  assert.match(alborz.sms, /بین کرج و ساوجبلاغ/);

  const varamin = resolvePlate("15 ط 200 ایران 30");
  assert.deepEqual(varamin.cities, ["ورامین", "پاکدشت"]);

  const kashan = resolvePlate("23 ل 100 ایران 23");
  assert.deepEqual(kashan.cities, ["کاشان", "خوانسار"]);
});

test("left serial splits a shared Khorasan code", () => {
  assert.deepEqual(resolvePlate("10 ج 100 ایران 42").cities, ["شیروان", "فاروج"]);
  assert.ok(resolvePlate("20 ج 100 ایران 42").cities.includes("مشهد"));
  assert.deepEqual(resolvePlate("40 ج 100 ایران 42").cities, ["مشهد"]);
  assert.deepEqual(resolvePlate("40 د 100 ایران 35").cities, ["عجب‌شیر"]);
  assert.deepEqual(resolvePlate("50 د 100 ایران 35").cities, ["عجب‌شیر", "بناب"]);
});

test("Shiraz star does not swallow the Kazarun serial exception", () => {
  assert.deepEqual(resolvePlate("10 ی 100 ایران 93").cities, ["کازرون"]);
  assert.deepEqual(resolvePlate("20 ی 100 ایران 93").cities, ["کازرون", "شیراز"]);
  assert.deepEqual(resolvePlate("10 ب 100 ایران 93").cities, ["شیراز"]);
});

test("reserved and unknown codes are explicit", () => {
  assert.equal(resolvePlate("11 ب 111 ایران 80").kind, "reserved");
  assert.equal(resolvePlate("11 ب 111 ایران 90").canNotify, false);
  assert.equal(resolvePlate("11 ب 111 ایران 00").kind, "unknown");
});

test("code 67 has no county for ه", () => {
  const result = resolvePlate("11 ه 100 ایران 67");
  assert.equal(result.kind, "province");
  assert.deepEqual(result.cities, []);
});

test("a gap in the serial table does not invent a city", () => {
  const gap = resolvePlate("30 ص 100 ایران 67");
  assert.equal(gap.kind, "province");
  assert.deepEqual(gap.cities, []);
  assert.deepEqual(gap.provinces, ["اصفهان"]);
  assert.match(gap.note, /سرشماره/);
});

test("an unlisted personal letter stays at province level", () => {
  const result = resolvePlate("11 ه 100 ایران 18");
  assert.equal(result.kind, "province");
  assert.deepEqual(result.cities, []);
  assert.deepEqual(result.provinces, ["همدان"]);
});

test("fully split codes cover every personal letter", () => {
  const codes = ["11", "12", "21", "23", "24", "25", "27", "29", "30", "32", "34", "35", "38", "41", "42", "43", "45", "53", "56", "57", "61", "63", "65", "68", "72", "73", "74", "78", "82", "83", "91"];
  for (const code of codes) {
    for (const letter of PERSONAL_LETTERS) {
      const result = resolvePlate({ left: "11", letter, mid: "111", region: code });
      assert.equal(result.ok, true, `${code} ${letter}`);
      assert.ok(result.cities.length > 0, `${code} ${letter} → ${result.kind} ${result.note}`);
    }
  }
});

test("motorcycle codes resolve to a province", () => {
  const tehran = resolvePlate("11112345", { vehicle: "motorcycle" });
  assert.deepEqual(tehran.provinces, ["تهران"]);
  assert.match(tehran.sms, /موتور/);
  const shared = resolvePlate({ code: "711", serial: "12345", vehicle: "motorcycle" });
  assert.equal(shared.kind, "shared");
  assert.deepEqual(shared.provinces, ["فارس", "خوزستان"]);
});

test("phone numbers", () => {
  assert.equal(normalizePhone("۰۹۱۲۳۴۵۶۷۸۹"), "09123456789");
  assert.equal(normalizePhone("+989123456789"), "09123456789");
  assert.equal(normalizePhone("9123456789"), null);
});
