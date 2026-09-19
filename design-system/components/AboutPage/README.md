The About page shell: back link, tracked-out title, one or more heading-plus-paragraph sections, and a small foot line.

`AboutPage({title, sections:[{heading, text}], foot, backHref})`. This page carries its own copy of the chrome tokens rather than importing the engine, so it stays a few kilobytes with no behaviour.
