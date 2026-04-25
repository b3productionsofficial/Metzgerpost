const standardLayouts = {
  klassisch: {
    feed: {
      woche: { x: 1200, y: 340, fontSize: 90 },
      meals: {
        dienstag: {
          imageX: 610,
          imageY: 930,
          imageRadius: 180,
          textX: 640,
          textY: 1266,
          textMaxWidth: 520,
          textLineHeight: 50,
          priceX: 640,
          priceY: 1560,
          priceColor: "#ffffff",
          textFontSize: 50,
          priceFontSize: 52
        },
        mittwoch: {
          imageX: 1535,
          imageY: 930,
          imageRadius: 180,
          textX: 1530,
          textY: 1265,
          textMaxWidth: 520,
          textLineHeight: 50,
          priceX: 1535,
          priceY: 1560,
          priceColor: "#2f2f2f",
          textFontSize: 50,
          priceFontSize: 52
        },
        donnerstag: {
          imageX: 610,
          imageY: 1775,
          imageRadius: 180,
          textX: 640,
          textY: 2125,
          textMaxWidth: 520,
          textLineHeight: 50,
          priceX: 640,
          priceY: 2360,
          priceColor: "#2f2f2f",
          textFontSize: 50,
          priceFontSize: 52
        },
        freitag: {
          imageX: 1530,
          imageY: 1775,
          imageRadius: 180,
          textX: 1540,
          textY: 2125,
          textMaxWidth: 520,
          textLineHeight: 48,
          priceX: 1535,
          priceY: 2360,
          priceColor: "#ffffff",
          textFontSize: 50,
          priceFontSize: 52
        }
      }
    },

    story: {
      woche: { x: 540, y: 355, fontSize: 38 },
      meals: {
        dienstag: {
          imageX: 270,
          imageY: 755,
          imageRadius: 120,
          textX: 270,
          textY: 845,
          textMaxWidth: 240,
          textLineHeight: 30,
          priceX: 270,
          priceY: 965,
          priceColor: "#ffffff",
          textFontSize: 22,
          priceFontSize: 24
        },
        mittwoch: {
          imageX: 810,
          imageY: 755,
          imageRadius: 120,
          textX: 810,
          textY: 845,
          textMaxWidth: 240,
          textLineHeight: 30,
          priceX: 810,
          priceY: 965,
          priceColor: "#2f2f2f",
          textFontSize: 22,
          priceFontSize: 24
        },
        donnerstag: {
          imageX: 270,
          imageY: 1265,
          imageRadius: 120,
          textX: 270,
          textY: 1355,
          textMaxWidth: 240,
          textLineHeight: 30,
          priceX: 270,
          priceY: 1475,
          priceColor: "#2f2f2f",
          textFontSize: 22,
          priceFontSize: 24
        },
        freitag: {
          imageX: 810,
          imageY: 1265,
          imageRadius: 120,
          textX: 810,
          textY: 1355,
          textMaxWidth: 240,
          textLineHeight: 30,
          priceX: 810,
          priceY: 1475,
          priceColor: "#ffffff",
          textFontSize: 22,
          priceFontSize: 24
        }
      }
    }
  }
}

window.standardLayouts = standardLayouts