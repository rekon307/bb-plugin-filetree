import { defineConfig } from "vitest/config";

// `@bb/plugin-sdk` only exists as ambient types (see types/bb-plugin-sdk.d.ts)
// and is provided by the real BB host at runtime — there is no npm package to
// resolve here. `server.ts` only uses `defineRpcContract` as a value, and that
// function is an identity passthrough (see the ambient declaration), so a
// virtual module stubbing it is enough to load `server.ts` under test.
const BB_PLUGIN_SDK_STUB_ID = "\0bb-plugin-sdk-stub";

export default defineConfig({
  test: {
    environment: "node",
  },
  plugins: [
    {
      name: "bb-plugin-sdk-stub",
      resolveId(id) {
        if (id === "@bb/plugin-sdk") return BB_PLUGIN_SDK_STUB_ID;
      },
      load(id) {
        if (id === BB_PLUGIN_SDK_STUB_ID) {
          return "export function defineRpcContract(contract) { return contract; }";
        }
      },
    },
  ],
});
