import test from "node:test";
import assert from "node:assert/strict";
import { gaslessUtxosCollection } from "@/queues/gaslessUtxos";
import { GaslessTestEnvironment } from "@/tests/utils/gaslessTestEnvironment";

test("gaslessUtxos", async (t) => {
  const env = new GaslessTestEnvironment();

  await env.init();

  t.after(async () => {
    await env.close();
  });

  await t.test("findAvailable()", async (t) => {
    t.afterEach(async () => {
      await env.clear();
    });

    await t.test("should return only available UTXOs", async () => {
      await env.seed([
        { utxoId: "utxo-1", status: "available" },
        { utxoId: "utxo-2", status: "reserved" },
        { utxoId: "utxo-3", status: "spent" },
      ]);

      const utxos = gaslessUtxosCollection(env.collection);
      const result = await utxos.findAvailable();

      assert.equal(result.length, 1);
      assert.equal(result[0].utxoId, "utxo-1");
    });

    await t.test(
      "should return empty array when no UTXOs available",
      async () => {
        await env.seed([
          { utxoId: "utxo-1", status: "reserved" },
          { utxoId: "utxo-2", status: "spent" },
        ]);

        const utxos = gaslessUtxosCollection(env.collection);
        const result = await utxos.findAvailable();

        assert.equal(result.length, 0);
      }
    );
  });

  await t.test("reserve()", async (t) => {
    t.afterEach(async () => {
      await env.clear();
    });

    await t.test("should reserve an available UTXO", async () => {
      await env.seed([{ utxoId: "utxo-1", status: "available" }]);

      const utxos = gaslessUtxosCollection(env.collection);
      const reserved = await utxos.reserve({ reservedBy: "reservation-123" });

      assert.ok(reserved);
      assert.equal(reserved.utxoId, "utxo-1");
      assert.equal(reserved.status, "reserved");
      assert.equal(reserved.reservedBy, "reservation-123");
      assert.ok(reserved.reservedAt instanceof Date);
    });

    await t.test("should return null when no UTXOs available", async () => {
      await env.seed([{ utxoId: "utxo-1", status: "spent" }]);

      const utxos = gaslessUtxosCollection(env.collection);
      const reserved = await utxos.reserve({ reservedBy: "reservation-123" });

      assert.equal(reserved, null);
    });

    await t.test("should not reserve an already reserved UTXO", async () => {
      await env.seed([
        { utxoId: "utxo-1", status: "reserved", reservedBy: "reservation-abc" },
      ]);

      const utxos = gaslessUtxosCollection(env.collection);
      const reserved = await utxos.reserve({ reservedBy: "reservation-xyz" });

      assert.equal(reserved, null);
    });

    await t.test(
      "should handle race condition — only one reservation wins",
      async () => {
        await env.seed([{ utxoId: "utxo-1", status: "available" }]);

        const utxos = gaslessUtxosCollection(env.collection);

        const [first, second] = await Promise.all([
          utxos.reserve({ reservedBy: "reservation-A" }),
          utxos.reserve({ reservedBy: "reservation-B" }),
        ]);

        const winners = [first, second].filter(Boolean);
        const losers = [first, second].filter((r) => r === null);

        assert.equal(winners.length, 1);
        assert.equal(losers.length, 1);

        assert.equal(winners[0]!.status, "reserved");
      }
    );

    await t.test(
      "should handle race condition with multiple UTXOs",
      async () => {
        await env.seed([
          { utxoId: "utxo-1", status: "available" },
          { utxoId: "utxo-2", status: "available" },
        ]);

        const utxos = gaslessUtxosCollection(env.collection);

        const results = await Promise.all([
          utxos.reserve({ reservedBy: "reservation-A" }),
          utxos.reserve({ reservedBy: "reservation-B" }),
          utxos.reserve({ reservedBy: "reservation-C" }),
        ]);

        const winners = results.filter(Boolean);
        const losers = results.filter((r) => r === null);

        assert.equal(winners.length, 2);
        assert.equal(losers.length, 1);
      }
    );
  });

  await t.test("release()", async (t) => {
    t.afterEach(async () => {
      await env.clear();
    });

    await t.test(
      "should release a reserved UTXO back to available",
      async () => {
        await env.seed([
          {
            utxoId: "utxo-1",
            status: "reserved",
            reservedBy: "reservation-123",
            reservedAt: new Date(),
          },
        ]);

        const utxos = gaslessUtxosCollection(env.collection);
        const released = await utxos.release("utxo-1");

        assert.ok(released);
        assert.equal(released.status, "available");
        assert.equal(released.reservedBy, undefined);
        assert.equal(released.reservedAt, undefined);
      }
    );

    await t.test("should return null when UTXO is not reserved", async () => {
      await env.seed([{ utxoId: "utxo-1", status: "available" }]);

      const utxos = gaslessUtxosCollection(env.collection);
      const released = await utxos.release("utxo-1");

      assert.equal(released, null);
    });

    await t.test("should return null when UTXO does not exist", async () => {
      const utxos = gaslessUtxosCollection(env.collection);
      const released = await utxos.release("utxo-nonexistent");

      assert.equal(released, null);
    });
  });

  await t.test("markSpent()", async (t) => {
    t.afterEach(async () => {
      await env.clear();
    });

    await t.test("should mark a reserved UTXO as spent", async () => {
      await env.seed([
        {
          utxoId: "utxo-1",
          status: "reserved",
          reservedBy: "reservation-123",
          reservedAt: new Date(),
        },
      ]);

      const utxos = gaslessUtxosCollection(env.collection);
      const spent = await utxos.markSpent("utxo-1", "0xspent-tx-hash");

      assert.ok(spent);
      assert.equal(spent.status, "spent");
      assert.equal(spent.spentTxHash, "0xspent-tx-hash");
      assert.equal(spent.reservedBy, undefined);
      assert.equal(spent.reservedAt, undefined);
    });

    await t.test("should return null when UTXO is not reserved", async () => {
      await env.seed([{ utxoId: "utxo-1", status: "available" }]);

      const utxos = gaslessUtxosCollection(env.collection);
      const spent = await utxos.markSpent("utxo-1", "0xspent-tx-hash");

      assert.equal(spent, null);
    });

    await t.test("should return null when UTXO does not exist", async () => {
      const utxos = gaslessUtxosCollection(env.collection);
      const spent = await utxos.markSpent(
        "utxo-nonexistent",
        "0xspent-tx-hash"
      );

      assert.equal(spent, null);
    });
  });

  await t.test("getStats()", async (t) => {
    t.afterEach(async () => {
      await env.clear();
    });

    await t.test("should return correct counts per status", async () => {
      await env.seed([
        { utxoId: "utxo-1", status: "available" },
        { utxoId: "utxo-2", status: "available" },
        { utxoId: "utxo-3", status: "reserved" },
        { utxoId: "utxo-4", status: "spent" },
        { utxoId: "utxo-5", status: "spent" },
        { utxoId: "utxo-6", status: "spent" },
      ]);

      const utxos = gaslessUtxosCollection(env.collection);
      const stats = await utxos.getStats();

      assert.equal(stats.available, 2);
      assert.equal(stats.reserved, 1);
      assert.equal(stats.spent, 3);
      assert.equal(stats.total, 6);
    });

    await t.test("should return zeros when collection is empty", async () => {
      const utxos = gaslessUtxosCollection(env.collection);
      const stats = await utxos.getStats();

      assert.equal(stats.available, 0);
      assert.equal(stats.reserved, 0);
      assert.equal(stats.spent, 0);
      assert.equal(stats.total, 0);
    });
  });

  await t.test("releaseExpired()", async (t) => {
    t.afterEach(async () => {
      await env.clear();
    });

    await t.test(
      "should release reservations older than 5 minutes",
      async () => {
        const expiredDate = new Date(Date.now() - 10 * 60 * 1000);

        await env.seed([
          {
            utxoId: "utxo-1",
            status: "reserved",
            reservedBy: "reservation-123",
            reservedAt: expiredDate,
          },
        ]);

        const utxos = gaslessUtxosCollection(env.collection);
        const released = await utxos.releaseExpired();

        assert.equal(released, 1);

        const doc = await env.collection.findOne({ utxoId: "utxo-1" });
        assert.equal(doc?.status, "available");
        assert.equal(doc?.reservedBy, undefined);
        assert.equal(doc?.reservedAt, undefined);
      }
    );

    await t.test(
      "should not release reservations newer than 5 minutes",
      async () => {
        const recentDate = new Date(Date.now() - 1 * 60 * 1000);

        await env.seed([
          {
            utxoId: "utxo-1",
            status: "reserved",
            reservedBy: "reservation-123",
            reservedAt: recentDate,
          },
        ]);

        const utxos = gaslessUtxosCollection(env.collection);
        const released = await utxos.releaseExpired();

        assert.equal(released, 0);

        const doc = await env.collection.findOne({ utxoId: "utxo-1" });
        assert.equal(doc?.status, "reserved");
      }
    );

    await t.test("should release only expired ones when mixed", async () => {
      const expiredDate = new Date(Date.now() - 10 * 60 * 1000);
      const recentDate = new Date(Date.now() - 1 * 60 * 1000);

      await env.seed([
        {
          utxoId: "utxo-1",
          status: "reserved",
          reservedBy: "r-1",
          reservedAt: expiredDate,
        },
        {
          utxoId: "utxo-2",
          status: "reserved",
          reservedBy: "r-2",
          reservedAt: recentDate,
        },
        {
          utxoId: "utxo-3",
          status: "reserved",
          reservedBy: "r-3",
          reservedAt: expiredDate,
        },
      ]);

      const utxos = gaslessUtxosCollection(env.collection);
      const released = await utxos.releaseExpired();

      assert.equal(released, 2);

      const stillReserved = await env.collection.findOne({ utxoId: "utxo-2" });
      assert.equal(stillReserved?.status, "reserved");
    });

    await t.test("should return 0 when nothing is expired", async () => {
      await env.seed([
        { utxoId: "utxo-1", status: "available" },
        { utxoId: "utxo-2", status: "spent" },
      ]);

      const utxos = gaslessUtxosCollection(env.collection);
      const released = await utxos.releaseExpired();

      assert.equal(released, 0);
    });
  });
});
