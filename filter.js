function min(a, b) {
  return Math.floor(Math.min(a, b));
}

function max(a, b) {
  return Math.floor(Math.max(a, b));
}

function bucket(value, max, buckets) {
  if (value === 0) {
    return 0;
  }

  const jump = (max + 1) / buckets;
  for (let i = 0; i < max; i += jump) {
    if (value <= i) {
      return Math.round(i - jump);
    }
  }

  return Math.round(max);
}

function luminosity(r, g, b) {
  return 0.21 * r + 0.72 * g + 0.07 * b;
}

function rotateBrush(brush, rotation) {
  return function(data, x, rx, xmax, y, ry, ymax, accumulate) {
    brush(data, x, rx, xmax, y, ry, ymax, function (_, _1, xN, yN) {
      const angle = rotation.get(x, y) * Math.PI / 180;
      // https://stackoverflow.com/questions/2259476/rotating-a-point-about-another-point-2d
      const _x = max(min(Math.cos(angle) * (xN - x) - Math.sin(angle) * (yN - y) + x, xmax), 0);
      const _y = max(min(Math.sin(angle) * (xN - x) + Math.cos(angle) * (yN - y) + y, ymax), 0);
      const index = (_y * xmax + _x) * 4;
      accumulate([
        data[index],
        data[index + 1],
        data[index + 2],
        data[index + 3],
      ], index, _x, _y);
    });
  };
}

function perturbedBrush(brush, radiusX, radiusY) {
  return function (data, x, rx, xmax, y, ry, ymax, accumulate) {
    brush(data, x, rx, xmax, y, ry, ymax, function (_, _1, xN, yN) {
      const pX = radiusX.get(xN);
      const pY = radiusY.get(yN);
      const _x = min(max(xN + pX, 0), xmax);
      const _y = min(max(yN + pY, 0), ymax);
      //const _x = min(max(xN + Math.random() * 5 - 2.5, 0), xmax);
      //const _y = min(max(yN + Math.random() * 5 - 2.5, 0), ymax);
      const index = (_y * xmax + _x) * 4;
      accumulate([
        data[index],
        data[index + 1],
        data[index + 2],
        data[index + 3],
      ], index, _x, _y);
    });
  };
}

function unpaintedBrush(brush, r = 255, g = 255, b = 255, a = 255) {
  return function (data, x, rx, xmax, y, ry, ymax, accumulate) {
    const copy = [];
    squareBrush(data, x, rx / 2, xmax, y, rx / 2, ymax, function (_, index) {
      copy.push(index);
    });

    const painted = [];

    brush(data, x, rx, xmax, y, ry, ymax, function (...args) {
      const index = args[1];
      painted.push(index);
      accumulate(...args);
    });

    copy.forEach(function (index) {
      if (!painted.includes(index)) {
        data[index] = data[index + 1] = data[index + 2] = 255;
      }
    });
  }; 
}

function squareBrush(data, x, rx, xmax, y, ry, ymax, accumulate) {
  for (let i = max(0, x - rx); i < min(xmax, x + rx); i++) {
    for (let j = max(0, y - ry); j < min(ymax, y + ry); j++) {
      const index = (j * xmax + i) * 4;
      accumulate([
        data[index],
        data[index + 1],
        data[index + 2],
        data[index + 3],
      ], index, i, j);
    }
  }
}

function triangleBrush(data, x, rx, xmax, y, ry, ymax, accumulate) {
  for (let i = max(0, x - rx); i < min(xmax, x + rx); i++) {
    for (let j = max(0, y - ry); j < min(ymax, y + ry); j++) {
      const index = (j * xmax + i) * 4;
      accumulate([
        data[index],
        data[index + 1],
        data[index + 2],
        data[index + 3],
      ], index, i, j);
    }
  }
}

function circleBrush(data, x, rx, xmax, y, ry, ymax, accumulate) {
  for (let i = -rx/2; i < rx/2; i++) {
    const dx = Math.sqrt(rx/2 * rx/2 - i * i);
    for (let j = -dx; j < dx; j++) {
      const _x = min(max(0, x + j), xmax);
      const _y = min(max(0, y + i), ymax);
      const index = (_y * xmax + _x) * 4;
      accumulate([
        data[index],
        data[index + 1],
        data[index + 2],
        data[index + 3],
      ], index, _x, _y);
    }
  }
}

function ovalBrush(data, x, rx, xmax, y, ry, ymax, accumulate) {
  ry /= 2;
  rx /= 2;
  for (let i = -rx; i <= rx; i++) {
    for (let j = -ry; j <= ry; j++) {
      if (i * i * ry * ry + j * j * rx * rx <= rx * rx * ry * ry) {
        const index = ((y + j) * xmax + (x + i)) * 4;
        accumulate([
          data[index],
          data[index + 1],
          data[index + 2],
          data[index + 3],
        ], index, i, j);
      }
    }
  }
}

/* r = max(r / number + (Math.random() * 100 - 50), 0);
 * g = max(g / number + (Math.random() * 100 - 50), 0);
 * b = max(b / number + (Math.random() * 100 - 50), 0);*/
//r = 0.21 * r + 0.72 * g + 0.07 * b;
//r = bucket(r, 255, 256);
//g = r;
//b = r;

//r = bucket(r, 255, 256);
//g = bucket(g, 255, 256);
//b = bucket(b, 255, 256);

function iterate(radiusX, radiusY, width, height, handler) {
  let x = 0, rx = radiusX.get(x, 0);
  let y = 0, ry = 0;
  for (; x < width; rx = radiusX.get(x, y), x += rx) {
    y = 0, ry = radiusY.get(y, x);
    for (; y < height; ry = radiusY.get(y, x), y += ry) {
      handler(x, y, rx, ry);
    }
  }
}

function blur(x, y, rx, ry, brush, imgData, width, height) {
  let number = 0,
      r = 0,
      g = 0,
      b = 0,
      a = 0;

  brush(imgData.data, x, rx, width, y, ry, height, function ([rN, gN, bN, aN]) {
    r += rN;
    g += gN;
    b += bN;
    a += aN;
    number++;
  });

  r = max(min(r / number, 255), 0);
  g = max(min(g / number, 255), 0);
  b = max(min(b / number, 255), 0);
  a = max(a / number, 0);

  brush(imgData.data, x, rx, width, y, ry, height, function(i, index) {
    imgData.data[index] = r;
    imgData.data[index + 1] = g;
    imgData.data[index + 2] = b;
    imgData.data[index + 3] = a;
  });
}

function blurDarken(x, y, rx, ry, brush, imgData, width, height) {
  let number = 0,
      r = 0,
      g = 0,
      b = 0,
      a = 0;

  brush(imgData.data, x, rx, width, y, ry, height, function ([rN, gN, bN, aN]) {
    r += rN;
    g += gN;
    b += bN;
    a += aN;
    number++;
  });

  r = max(min(r / number, 255), 0);
  g = max(min(g / number, 255), 0);
  b = max(min(b / number, 255), 0);
  a = max(a / number, 0);

  brush(imgData.data, x, rx, width, y, ry, height, function(i, index) {
    imgData.data[index] = Math.min(r, imgData.data[index]);
    imgData.data[index + 1] = Math.min(g, imgData.data[index + 1]);
    imgData.data[index + 2] = Math.min(b, imgData.data[index + 2]);
    imgData.data[index + 3] = Math.min(a, imgData.data[index + 3]);
  });
}

function blurLighten(x, y, rx, ry, brush, imgData, width, height) {
  let number = 0,
      r = 0,
      g = 0,
      b = 0,
      a = 0;

  brush(imgData.data, x, rx, width, y, ry, height, function ([rN, gN, bN, aN]) {
    r += rN;
    g += gN;
    b += bN;
    a += aN;
    number++;
  });

  r = max(min(r / number, 255), 0);
  g = max(min(g / number, 255), 0);
  b = max(min(b / number, 255), 0);
  a = max(a / number, 0);

  brush(imgData.data, x, rx, width, y, ry, height, function(i, index) {
    imgData.data[index] = Math.max(r, imgData.data[index]);
    imgData.data[index + 1] = Math.max(g, imgData.data[index + 1]);
    imgData.data[index + 2] = Math.max(b, imgData.data[index + 2]);
    imgData.data[index + 3] = Math.max(a, imgData.data[index + 3]);
  });
}

function outline(x, y, rx, ry, brush, imgData, width, height) {
  let number = 0,
      r = 0,
      g = 0,
      b = 0;

  brush(imgData.data, x, rx, width, y, ry, height, function ([rN, gN, bN, aN]) {
    r += rN;
    g += gN;
    b += bN;
    number++;
  });

  r = max(min(r / number, 255), 0);
  g = max(min(g / number, 255), 0);
  b = max(min(b / number, 255), 0);
  const avg = luminosity(r, g, b);

  brush(imgData.data, x, rx, width, y, ry, height, function([rN, gN, bN], index) {
    const thisAvg = luminosity(rN, gN, bN);
    const c = thisAvg > avg ? 255 : 0;
    imgData.data[index] = c;
    imgData.data[index + 1] = c;
    imgData.data[index + 2] = c;
  });
}

function identity(x, y, rx, ry, brush, imgData, width, height) {
  const d = [];

  brush(imgData.data, x, rx, width, y, ry, height, function ([rN, gN, bN, aN], index) {
    d[index] = rN;
    d[index + 1] = gN;
    d[index + 2] = bN;
    d[index + 3] = aN;
  });

  brush(imgData.data, x, rx, width, y, ry, height, function(_, index) {
    imgData.data[index] = d[index];
    imgData.data[index + 1] = d[index + 1];
    imgData.data[index + 2] = d[index + 2];
    imgData.data[index + 3] = d[index + 3];
  });
}

function apply(img, context, filter, radiusX, radiusY, ...args) {
  const imgData = context.getImageData(0, 0, img.width, img.height);
  const height = img.height;
  const width = img.width;

  iterate(radiusX, radiusY, width, height, function (x, y, rx, ry) {
    filter(x, y, rx, ry, ...args, imgData, width, height);
  });

  context.putImageData(imgData, 0, 0);
}

function R(n, max, nonRandom, useNegatives, deviation) {
  this.max = max;
  this.radii = useNegatives ? new Int32Array(n) : new Uint32Array(n);
  window.crypto.getRandomValues(this.radii);
  for (let i = 0; i < n; i++) {
    const maxWithNegative = max / (useNegatives ? 2 : 1);
    if (nonRandom) {
      this.radii[i] = max;
    } else {
      this.radii[i] %= maxWithNegative;
    }

    if (deviation) {
      this.radii[i] = Math.max(maxWithNegative - deviation, Math.min(this.radii[i], maxWithNegative + deviation));
    }
  }
}

R.prototype.get = function (n, m) {
  if (typeof m !== 'undefined' && !isNaN(m)) {
    return max(this.radii[Math.floor(Math.sqrt(m * m + n * n)) % this.max], 1);
  }
  return max(this.radii[n], 1);
}

const img = document.querySelector('img');
img.src = window.location.hash.substring(1);

window.onload = function() {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const context = canvas.getContext('2d');
  context.drawImage(img, 0, 0, img.width, img.height);
  document.body.appendChild(canvas);

  apply(img, context, blurDarken,
        new R(img.width, 10), new R(img.height, 5),
        rotateBrush(squareBrush, new R(360, 60)));
}
