# Path to this plugin
PROTOC_GEN_TS_PATH="./node_modules/.bin/protoc-gen-ts"

# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./lib/types"
PROTO_PATH="types.proto"
# protoc \
#     --plugin="protoc-gen-ts=${PROTOC_GEN_TS_PATH}" \
#     --js_out="import_style=commonjs,binary:${OUT_DIR}" \
#     --ts_out="${OUT_DIR}" \
#     ./lib/types.proto
npx protoc --ts_out $OUT_DIR --js_out="import_style=commonjs,binary:${OUT_DIR}"  --proto_path lib $PROTO_PATH 