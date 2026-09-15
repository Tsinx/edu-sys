/* Qingzhi: authored SVG micro-motion. The original SVG remains the rest artwork. */
(function (global) {
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const number = x => String(Math.round(x * 10000) / 10000);
  const tokens = d => d.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g);

  // These are authored closed shapes with the same command topology as the drawing.
  // Only lids deform. Irises, pupils and their highlights keep their shape.
  const closed = {
    left: {
      aperture: 'M306 434C328 456 377 457 408 438C377 457 328 456 306 434Z',
      liner: 'M298 431C309 434 313 437 326 442C356 455 387 451 409 438L404 441C377 459 340 458 316 444L306 438Z',
      lashes: 'M311 441C306 443 302 447 300 450C306 447 311 446 317 445ZM322 447C318 450 315 453 315 457C319 454 324 451 330 450ZM334 451C331 454 329 457 330 460C333 457 336 455 340 453Z',
      lower: 'M309 437C333 456 371 458 396 446',
      lowerLashes: 'M316 442Q314 445 312 446M325 447Q324 449 323 450M386 449L388 451',
      crease: 'M320 425C345 433 376 434 393 427',
      irisShadow: 'M300 425C339 449 376 450 413 429',
      shadow: 'M303 427C328 447 379 450 412 434L404 442C373 451 329 452 308 435Z'
    },
    right: {
      aperture: 'M492 437C521 457 566 455 595 429C566 455 521 457 492 437Z',
      liner: 'M491 437C519 453 545 455 574 441C585 437 592 432 603 424L594 433C565 460 527 460 496 441Z',
      lashes: 'M584 439C590 441 595 444 597 447C591 445 587 443 580 443ZM574 445C579 448 582 451 582 455C578 452 573 449 567 448ZM563 450C566 453 569 456 568 459C565 456 562 454 558 452Z',
      lower: 'M503 445C530 458 566 455 588 435',
      lowerLashes: 'M579 443Q581 446 583 447M570 449Q572 451 573 452M512 448L510 450',
      crease: 'M507 427C529 434 559 432 580 423',
      irisShadow: 'M487 428C524 450 567 449 601 420',
      shadow: 'M487 434C519 451 570 447 600 423L592 436C565 450 522 451 498 440Z'
    }
  };

  function create(svg, { seed = 170907, onChange = () => {} } = {}) {
    const $ = id => {
      const element = svg.querySelector('#' + id);
      if (!element) throw new Error('Missing Qingzhi part: ' + id);
      return element;
    };
    let randomState = seed >>> 0;
    function random(min, max) {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      return min + randomState / 4294967296 * (max - min);
    }
    const saved = new Map();
    function remember(element, attribute) {
      if (!saved.has(element)) saved.set(element, new Map());
      const attrs = saved.get(element);
      if (!attrs.has(attribute)) attrs.set(attribute, element.getAttribute(attribute));
      return attrs.get(attribute);
    }
    function set(element, attribute, value) {
      remember(element, attribute);
      if (value === null) element.removeAttribute(attribute);
      else if (element.getAttribute(attribute) !== String(value)) element.setAttribute(attribute, String(value));
    }
    function restore(element, attribute) { set(element, attribute, remember(element, attribute)); }
    function morph(element, target) {
      const original = remember(element, 'd');
      const from = tokens(original), to = tokens(target);
      if (from.length !== to.length || from.some((v, i) => isNaN(Number(v)) && v !== to[i])) {
        throw new Error('Incompatible eye key shapes: ' + original);
      }
      return amount => set(element, 'd', amount === 0 ? original : amount === 1 ? target :
        from.map((v, i) => isNaN(Number(v)) ? v : number(Number(v) + (Number(to[i]) - Number(v)) * amount)).join(' '));
    }
    const eyes = ['left', 'right'].map((side, index) => {
      const eye = $('eye-' + side);
      const paths = [...eye.children].filter(node => node.localName === 'path');
      const iris = $('iris-' + side);
      const irisShadow = iris.parentElement.querySelector(':scope > path');
      const shadow = $('eyelid-shadows').children[index];
      const key = closed[side];
      const transitions = [
        morph(paths[0], key.aperture),
        morph($('eye-' + side + '-clip').firstElementChild, key.aperture),
        morph(paths[1], key.liner), morph(paths[2], key.lashes),
        morph(paths[3], key.lower), morph(paths[4], key.lowerLashes),
        morph(paths[5], key.crease), morph(irisShadow, key.irisShadow), morph(shadow, key.shadow)
      ];
      return { iris, paths, shadow, transitions };
    });
    const body = $('body'), head = $('head'), rearHair = $('hair-back');

    // The same smooth displacement field is applied to fill, ink and highlights.
    // Roots above y=470 are fixed; only the hanging ends receive secondary motion.
    const hairPaths = ['hair-front-left', 'hair-front-right'].map(id =>
      [...$(id).querySelectorAll('path')].map(element => {
        const original = remember(element, 'd');
        const parts = tokens(original);
        if (parts.some(v => /^[A-Za-z]$/.test(v) && !'MLCQZ'.includes(v))) {
          throw new Error('Unsupported hair path command');
        }
        return { element, original, parts };
      })
    );
    function hairShift(paths, amount) {
      for (const { element, original, parts } of paths) {
        if (amount === 0) { set(element, 'd', original); continue; }
        let output = '';
        for (let i = 0; i < parts.length;) {
          if (/^[A-Za-z]$/.test(parts[i])) { output += parts[i++] + ' '; continue; }
          const x = Number(parts[i++]), y = Number(parts[i++]);
          const weight = smooth((y - 470) / 450);
          output += number(x + weight * amount) + ' ' + number(y) + ' ';
        }
        set(element, 'd', output.trim());
      }
    }
    const rest = () => ({ blink: 0, breath: 0, gazeX: 0, gazeY: 0, hair: 0 });
    let pose = rest(), lastPose = null;
    let running = false, suspended = false, solo = false, raf = null, last = null;
    let clock = 0, ambient = 0, blinkEvent = null, gazeEvent = null, settling = null, previewing = false;
    let nextBlink = random(2.8, 4.2), nextGaze = random(10, 15);
    let breathStart = 0, breathPeriod = random(6.1, 7.8), breathPeak = random(.86, 1);
    let hairPosition = 0, hairVelocity = 0, gazeDirection = 1;
    const counts = { blink: 0, glance: 0 };

    function render(next) {
      next.blink = clamp(next.blink); next.breath = clamp(next.breath);
      if (!lastPose || next.blink !== lastPose.blink) {
        for (const eye of eyes) {
          eye.transitions.forEach(update => update(next.blink));
          // The aperture collapses along one curve; suppress the antialiased sliver
          // at full closure and gradually retire the lower-lid accents.
          set(eye.paths[0], 'opacity', next.blink === 1 ? '0' : null);
          set(eye.iris.parentElement, 'opacity', next.blink === 1 ? '0' : null);
          for (const path of [eye.paths[3], eye.paths[4]]) {
            set(path, 'opacity', next.blink === 0 ? null : number(1 - smooth(next.blink) * .93));
          }
          set(eye.shadow, 'opacity', next.blink === 0 ? null : number(1 - smooth(next.blink) * .8));
        }
      }
      if (!lastPose || next.gazeX !== lastPose.gazeX || next.gazeY !== lastPose.gazeY) {
        for (const { iris } of eyes) set(iris, 'transform', next.gazeX || next.gazeY ?
          `translate(${number(next.gazeX)} ${number(next.gazeY)})` : null);
      }
      if (!lastPose || next.breath !== lastPose.breath) {
        const b = next.breath;
        set(body, 'transform', b ? `translate(451 1100) scale(${number(1 + .0016 * b)} ${number(1 + .0045 * b)}) translate(-451 -1100)` : null);
        const headTransform = b ? `translate(0 ${number(-.65 * b)})` : null;
        set(head, 'transform', headTransform);
        set(rearHair, 'transform', headTransform);
      }
      if (!lastPose || next.hair !== lastPose.hair) {
        hairShift(hairPaths[0], next.hair * .8);
        hairShift(hairPaths[1], -next.hair * .6);
      }
      pose = { ...next }; lastPose = { ...next };
    }
    function state() { return { running, suspended, solo, clock, ambient, pose: { ...pose }, counts: { ...counts } }; }
    function notify(reason) { onChange({ reason, ...state() }); }
    function halt() { if (raf !== null) cancelAnimationFrame(raf); raf = null; last = null; }
    function schedule() { if (raf === null && !suspended && (running || solo)) raf = requestAnimationFrame(tick); }
    function beginBlink(manual = false) {
      blinkEvent = { start: clock, duration: random(.27, .32), from: pose.blink, manual };
      counts.blink++;
    }
    function beginGlance(manual = false) {
      gazeDirection *= -1;
      gazeEvent = { start: clock, x: gazeDirection * random(2.6, 3.6), y: random(-.65, .8), fromX: pose.gazeX, fromY: pose.gazeY, hold: random(1.3, 2.1), manual };
      counts.glance++;
    }
    function tick(now) {
      raf = null;
      const dt = last === null ? 0 : Math.min(.1, Math.max(0, (now - last) / 1000));
      last = now; clock += dt;
      const next = { ...pose };
      if (settling) {
        const progress = clamp((clock - settling.start) / .65);
        for (const key of Object.keys(next)) next[key] = settling.from[key] * (1 - smooth(progress));
        if (progress >= 1) settling = null;
      } else if (running) {
        ambient += dt;
        if (ambient - breathStart >= breathPeriod) {
          breathStart += breathPeriod; breathPeriod = random(6.1, 7.8); breathPeak = random(.86, 1);
        }
        const phase = clamp((ambient - breathStart) / breathPeriod);
        next.breath = breathPeak * (phase < .41 ? smooth(phase / .41) : 1 - smooth((phase - .41) / .59));
        // Damped following, driven only by breathing, without an independent wind loop.
        hairVelocity += (22 * (next.breath - hairPosition) - 9 * hairVelocity) * dt;
        hairPosition += hairVelocity * dt;
        next.hair = hairPosition;
        if (ambient >= nextBlink && !blinkEvent) { beginBlink(); nextBlink = ambient + random(8, 14); }
        if (ambient >= nextGaze && !gazeEvent && !blinkEvent) { beginGlance(); nextGaze = ambient + random(19, 31); }
      }
      let manualFinished = false;
      if (blinkEvent) {
        const progress = clamp((clock - blinkEvent.start) / blinkEvent.duration);
        next.blink = progress < .3 ? blinkEvent.from + (1 - blinkEvent.from) * smooth(progress / .3) : progress < .43 ? 1 : 1 - smooth((progress - .43) / .57);
        if (progress >= 1) { manualFinished ||= blinkEvent.manual; blinkEvent = null; next.blink = 0; }
      }
      if (gazeEvent) {
        const t = clock - gazeEvent.start;
        const returning = .28 + gazeEvent.hold;
        const mix = t < .28 ? smooth(t / .28) : t < returning ? 1 : 1 - smooth((t - returning) / .65);
        next.gazeX = gazeEvent.x * mix + (t < .28 ? gazeEvent.fromX * (1 - mix) : 0);
        next.gazeY = gazeEvent.y * mix + (t < .28 ? gazeEvent.fromY * (1 - mix) : 0);
        if (t >= returning + .65) { manualFinished ||= gazeEvent.manual; gazeEvent = null; next.gazeX = 0; next.gazeY = 0; }
      }
      render(next);
      if (!blinkEvent && !gazeEvent) solo = false;
      if (manualFinished) notify('finished');
      if (running || solo) schedule(); else last = null;
    }
    function pause() { running = false; solo = false; halt(); notify('pause'); }
    function stop() {
      running = false; solo = false; halt(); blinkEvent = null; gazeEvent = null; settling = null; previewing = false;
      clock = 0; ambient = 0; breathStart = 0; hairPosition = 0; hairVelocity = 0;
      nextBlink = random(2.8, 4.2); nextGaze = random(10, 15);
      render(rest());
      // Restore source strings and absent attributes exactly, including rest paths.
      for (const [element, attrs] of saved) for (const attr of attrs.keys()) restore(element, attr);
      notify('stop');
    }
    return {
      play() {
        if (previewing) {
          settling = { start: clock, from: { ...pose } }; previewing = false;
          ambient = 0; breathStart = 0; hairPosition = 0; hairVelocity = 0;
          blinkEvent = null; gazeEvent = null;
          nextBlink = random(2.8, 4.2); nextGaze = random(10, 15);
        }
        running = true; solo = false; schedule(); notify('play');
      },
      pause, stop,
      blink() {
        settling = null; if (!running) gazeEvent = null;
        beginBlink(true); nextBlink = ambient + random(8, 14); solo = !running; schedule(); notify('blink');
      },
      glance() {
        settling = null; if (!running) blinkEvent = null;
        beginGlance(true); nextGaze = ambient + random(19, 31); solo = !running; schedule(); notify('glance');
      },
      previewBlink(value) {
        pause(); blinkEvent = null; gazeEvent = null; settling = null; previewing = true;
        render({ ...pose, blink: clamp(Number(value) || 0) }); notify('preview');
      },
      previewBreath(value) {
        stop(); previewing = true; render({ ...pose, breath: clamp(Number(value) || 0), hair: clamp(Number(value) || 0) }); notify('preview');
      },
      suspend(value) { suspended = Boolean(value); if (suspended) halt(); else schedule(); notify('visibility'); },
      getState: state,
      destroy() { stop(); }
    };
  }
  global.QingzhiMotion = Object.freeze({ create });
})(window);
