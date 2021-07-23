const OFFSET_PX = 0;
const MIN_WIDTH = 12
const MIN_HEIGHT = 8

const START_FRACTION = 0.4
const MIDDLE_FRACTION = 0.8
const KEYDOWN_DELAY = 42 // Delay between key press and blur (in ms)
const CATCH_KEYS = ['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
let ANIMATION_ID = 0

type SVGContent = {
  element: SVGElement,
  polygon: SVGPolygonElement,
  start: SVGStopElement,
  middle: SVGStopElement,
  end: SVGStopElement,
  gradient: SVGGradientElement
}

type Point = {
  x: number,
  y: number,
}

type Rect = {
  top: number,
  left: number,
  bottom: number,
  right: number,
  width: number,
  height: number
}

class FocusSnail extends HTMLElement {

  private keydownTime = 0
  private prevFocused: HTMLElement | null = null
  private _svg: SVGContent | null = null

  connectedCallback () {
    this.attachShadow({mode: 'open'});
    document.addEventListener('keydown', this.onKeyDown, false);
    document.addEventListener('focus', this.onFocus, true);
    document.addEventListener('blur', this.onBlur, true);
  }

  disconnectedCallback () {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('focus', this.onFocus);
    document.removeEventListener('blur', this.onBlur);
  }

  private onBlur = (e: FocusEvent) => {
    this.onEnd()
    if (this.isJustPressed() && e.target) {
      this.prevFocused = e.target as HTMLElement
    } else {
      this.prevFocused = null
    }
  }

  private onFocus = (e: FocusEvent) => {
    if (!this.isJustPressed() || !this.prevFocused) {
      return;
    }
    this.animateFocus(this.prevFocused, e.target as HTMLElement)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (CATCH_KEYS.includes(e.key)) {
      this.keydownTime = Date.now()
    }
  }

  private onEnd () {
    if (ANIMATION_ID) {
      cancelAnimationFrame(ANIMATION_ID)
      ANIMATION_ID = 0
    }
  }

  /**
   * Detects if the key was pressed recently
   */
  private isJustPressed () {
    return Date.now() - this.keydownTime < KEYDOWN_DELAY
  }

  private animateFocus (prevElement: HTMLElement, currentElement: HTMLElement) {
    console.log('animate', prevElement, currentElement)

    const prevRect = getAbsoluteBoundingClientRect(prevElement)
    const currentRect = getAbsoluteBoundingClientRect(currentElement)

    let left = 0
    let prevLeft = 0
    let top = 0
    let prevTop = 0

    const distance = distanceBetween(prevRect, currentRect)
    const duration = durationFromDistance(distance)

    // Setup the svg
    const svg = this.svg.element
    this.style.setProperty('left', px(window.pageXOffset))
    this.style.setProperty('top', px(window.pageYOffset))
    this.style.setProperty('width', px(window.innerWidth))
    this.style.setProperty('height', px(window.innerHeight))
    svg.setAttribute('width', window.innerWidth.toString())
    svg.setAttribute('height', window.innerHeight.toString())
    left = currentRect.left - window.pageXOffset;
    prevLeft = prevRect.left - window.pageXOffset;
    top = currentRect.top - window.pageYOffset;
    prevTop = prevRect.top - window.pageYOffset;
    // Set the gradient angle
    setGradientAngle(this.svg.gradient, prevRect, currentRect)
    drawPolygon(this.svg.polygon, prevRect, currentRect)

    // Log the distance and the duration
    animate(fraction => {
      // TODO : animate
    }, duration)
  }

  private get svg(): SVGContent
  {
    if (!this._svg) {
      const root = this.shadowRoot!
      root.innerHTML = `
  <style>
  :host {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
  }
  #focus-snail_svg {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    margin: 0;
    background: transparent;
    pointer-events: none;
    -webkit-transform: translateZ(0);
  }
  #focus-snail_svg.focus-snail_visible {
	visibility: visible;
	z-index: 999;
  }
  #focus-snail_polygon {
    stroke-width: 0;
  }
  </style>
  <svg id="focus-snail_svg" width="1000" height="800">
		<linearGradient id="focus-snail_gradient">
			<stop id="focus-snail_start" offset="0%" stop-color="rgb(91, 157, 217)" stop-opacity="0"/>
			<stop id="focus-snail_middle" offset="80%" stop-color="rgb(91, 157, 217)" stop-opacity="0.8"/>
			<stop id="focus-snail_end" offset="100%" stop-color="rgb(91, 157, 217)" stop-opacity="0"/>
		</linearGradient>
		<polygon id="focus-snail_polygon" fill="url(#focus-snail_gradient)" points=""/>
	</svg>`
      this._svg = {
        element: root.querySelector('#focus-snail_svg') as SVGElement,
        polygon: root.querySelector('#focus-snail_polygon') as SVGPolygonElement,
        start: root.querySelector('#focus-snail_start') as SVGStopElement,
        middle: root.querySelector('#focus-snail_middle') as SVGStopElement,
        end: root.querySelector('#focus-snail_end') as SVGStopElement,
        gradient: root.querySelector('#focus-snail_gradient') as SVGGradientElement
      }
    }
    return this._svg
  }

}

/**
 * Find the element bounding rect from the top / left corner of the document
 */
function getAbsoluteBoundingClientRect(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect()
  const width = Math.max(MIN_WIDTH, rect.width)
  const height = Math.max(MIN_HEIGHT, rect.height)
  return {
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset,
    bottom: rect.top + height,
    right: rect.left + width,
    width,
    height
  };
}

/**
 * Find the distance between 2 rects
 */
function distanceBetween(start: Rect, end: Rect): number {
  const dy = start.top - end.top
  const dx = start.left - end.left
  return Math.sqrt(dx*dx + dy*dy)
}

/**
 * Find the duration for the animation based on the distance
 */
function durationFromDistance(distance: number): number {
  return Math.pow(clamp(distance, 32, 1024), 1/3) * 50;
}

/**
 * Clamp a value between a minimum and maximum value
 * */
function clamp (value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Set a gradient angle between two rects **/
function setGradientAngle (gradient: SVGGradientElement, from: Rect, to: Rect) {
  const fromCenter = {x: from.left + from.width / 2, y: from.top + from.height / 2}
  const toCenter = {x: to.left + to.width / 2, y: to.top + to.height / 2}
  const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x)
  const line = angleToLine(angle)
  gradient.setAttribute('x1', line[0].x.toString());
  gradient.setAttribute('y1', line[0].y.toString());
  gradient.setAttribute('x2', line[1].x.toString());
  gradient.setAttribute('y2', line[1].y.toString());
}

/**
 * Convert an angle into a line
 */
function angleToLine (angle: number): [{x: number, y: number}, {x: number, y: number}] {
  const segment = Math.floor(angle / Math.PI * 2) + 2;
  const diagonal = Math.PI/4 + Math.PI/2 * segment;

  const od = Math.sqrt(2);
  const op = Math.cos(Math.abs(diagonal - angle)) * od;
  const x = op * Math.cos(angle);
  const y = op * Math.sin(angle);

  return [{
    x: x < 0 ? 1 : 0,
    y: y < 0 ? 1 : 0,
  }, {
    x: x >= 0 ? x : x + 1,
    y: y >= 0 ? y : y + 1
  }];
}

/**
 * Draw a polygon
 */
function drawPolygon (polygon: SVGPolygonElement, from: Rect, to: Rect) {
  let x: number = 0;
  console.log(from, to)
  if (from.top < to.top) {
    x = 1
  }
  if (from.right > to.right) {
    x += 2
  }

  if (from.bottom > to.bottom) {
    x += 4
  }

  if (from.left < to.left) {
    x += 8
  }

  const dict = [
    [],
    [0, 1],
    [1, 2],
    [0, 1, 2],
    [2, 3],
    [0, 1],
    [1, 2, 3],
    [0, 1, 2, 3],
    [3, 0],
    [3, 0, 1],
    [3, 0],
    [3, 0, 1, 2],
    [2, 3, 0],
    [2, 3, 0, 1],
    [1, 2, 3, 0],
    [0, 1, 2, 3, 0]
  ]
  const points = rectToPoints(from).concat(rectToPoints(to));
  const polygonPoints: Point[] = [];
  const indexes = dict[x]
  let i = 0;
  for (i = 0; i < indexes.length; i++) {
    polygonPoints.push(points[indexes[i]])
  }
  while (i--) {
    polygonPoints.push(points[indexes[i] + 4]);
  }
  polygon.points.clear()
  for (let point of polygonPoints) {
    const pt = polygon.ownerSVGElement!.createSVGPoint()
    pt.x = point.x
    pt.y = point.y
    polygon.points.appendItem(pt)
  }
  console.log(polygonPoints, points, x);


}

function rectToPoints(rect: Rect): [Point, Point, Point, Point] {
  return [
    {
      x: rect.left,
      y: rect.top
    },
    {
      x: rect.right,
      y: rect.top
    },
    {
      x: rect.right,
      y: rect.bottom
    },
    {
      x: rect.left,
      y: rect.bottom
    }
  ];
}

/**
 * Animate
 */
function animate(step: (duration: number) => any, duration: number): void
{
  const start = Date.now()
  const loop = () => {
    const diff = Date.now() - start
    const fraction  = Math.min(diff / duration, 1)
    step(fraction)
    if (diff < duration) {
      ANIMATION_ID = requestAnimationFrame(loop)
    }
  }

  loop()
}

function px(n: number) {
  return n.toString() + 'px';
}

customElements.define('focus-snail', FocusSnail)
