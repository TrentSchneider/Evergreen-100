import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const schemaImportFailureFactory = vi.hoisted(() => () => {
	throw new Error("schema import failure");
});

async function runReset() {
	const { resetDb } = await import("../../helpers/resetDb.js");
	await resetDb();
}

async function loadOpenDbModule() {
	return import("../../../src/db/openDb.js");
}

function createOpenRequestStub() {
	return {
		onerror: null,
		onsuccess: null,
		onupgradeneeded: null,
		result: null,
		error: null,
		transaction: null
	};
}

describe("openDb.errorPaths", () => {
	beforeEach(async () => {
		await runReset();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		const { __resetDbInstance } = await loadOpenDbModule();
		__resetDbInstance();
		vi.resetModules();
	});

	it("propagates indexedDB.open request errors", async () => {
		const { openDb } = await loadOpenDbModule();
		const openError = new Error("open failure");

		const openSpy = vi.spyOn(indexedDB, "open").mockImplementation(() => {
			const req = createOpenRequestStub();
			setTimeout(() => {
				req.error = openError;
				if (req.onerror) req.onerror();
			}, 0);
			return req;
		});

		await expect(openDb()).rejects.toBe(openError);
		openSpy.mockRestore();
	});

	it("rejects when migrations throw during onupgradeneeded", async () => {
		const schemaModule = await import("../../../src/db/schema.js");
		const migrationError = new Error("migration failure");
		const migrateSpy = vi
			.spyOn(schemaModule, "migrateFrom")
			.mockImplementation(() => {
				throw migrationError;
			});

		const { openDb } = await loadOpenDbModule();
		await expect(openDb()).rejects.toHaveProperty("name", "AbortError");
		expect(migrateSpy).toHaveBeenCalled();
	});

	it("fails fast when schema import rejects", async () => {
		vi.resetModules();
		vi.doMock("../../../src/db/schema.js", schemaImportFailureFactory);
		const { openDb } = await import("../../../src/db/openDb.js");
		await expect(openDb()).rejects.toThrow("schema import failure");
		vi.resetModules();
	});
});
