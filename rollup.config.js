import resolve from "rollup-plugin-node-resolve";
import commonJS from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript";

export default {
  input: "./example/index.ts",
  output: {
    file: "./example/dist/bundle.js",
    format: "iife"
  },
  plugins: [
    resolve({
      browser: true
    }),
    commonJS({ extensions: [".js"] }),
    typescript()
  ]
};
