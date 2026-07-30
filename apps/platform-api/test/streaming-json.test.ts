import assert from "node:assert/strict";
import test from "node:test";
import {
  StreamingJsonDialogueError,
  StreamingJsonDialogueExtractor
} from "@edu/contracts";

test("streaming JSON extractor emits only the decoded top-level dialogue value", () => {
  const raw =
    '{"actions":[{"type":"slides.next"}],"schema":"edu.classroom.assistant.response","version":"1.0","dialogue":"港口\\n包含\\u6c34\\u57df，称为\\"枢纽\\" 🚢。"}';
  const extractor = new StreamingJsonDialogueExtractor();
  let spoken = "";

  // Deliberately split by UTF-16 code unit, including inside escapes and emoji.
  for (let index = 0; index < raw.length; index += 1) {
    spoken += extractor.push(raw.slice(index, index + 1));
  }

  const envelope = extractor.finish();
  assert.equal(spoken, '港口\n包含水域，称为"枢纽" 🚢。');
  assert.equal(envelope.dialogue, spoken);
  assert.deepEqual(envelope.actions, [{ type: "slides.next" }]);
  assert.doesNotMatch(spoken, /slides|schema|version/);
});

test("streaming JSON extractor refuses non-string, duplicate and invalid envelopes", () => {
  const nonString = new StreamingJsonDialogueExtractor();
  assert.throws(
    () => nonString.push('{"dialogue":42'),
    /dialogue 必须是字符串/
  );

  const duplicate = new StreamingJsonDialogueExtractor();
  assert.throws(
    () =>
      duplicate.push(
        '{"dialogue":"第一段","dialogue":"第二段","actions":[],"schema":"edu.classroom.assistant.response","version":"1.0"}'
      ),
    /只能包含一个 dialogue/
  );

  const incomplete = new StreamingJsonDialogueExtractor();
  assert.equal(
    incomplete.push(
      '{"dialogue":"可以先流式显示","actions":[],"schema":"wrong","version":"1.0"}'
    ),
    "可以先流式显示"
  );
  assert.throws(
    () => incomplete.finish(),
    StreamingJsonDialogueError
  );
});
