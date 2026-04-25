const standardGerichte = {
  schlachtschuessel: { bild: "Gerichte/schlachtschuessel.jpg", preis: "ab 5,00 €", text: "Schlachtschüssel" },
  kotelett: { bild: "Gerichte/kotelett.jpg", preis: "6,80 €", text: "Kotelett mit Kartoffelsalat" },
  fleischteller: { bild: "Gerichte/fleischteller.jpg", preis: "€ pro 100g", text: "Schnitzel, Bratwürste, Frikadelle und Fleischkäse mit Kartoffelsalat" },
  schaeufele: { bild: "Gerichte/schaeufele.jpg", preis: "8,50 €", text: "Schäufele mit Knödel" },
  cordonbleu: { bild: "Gerichte/cordonbleu.jpg", preis: "6,80 €", text: "Cordon Bleu mit Kartoffelsalat" },
  gyros: { bild: "Gerichte/gyros.jpg", preis: "6,80 €", text: "Gyros mit Krautsalat und Zaziki" },
  schweinebraten: { bild: "Gerichte/schweinebraten.jpg", preis: "8,50 €", text: "Schweinebraten mit Knödel" },
  schaschlik: { bild: "Gerichte/schaschlik.jpg", preis: "8,50 €", text: "Schaschlik" },
  gulasch: { bild: "Gerichte/gulasch.jpg", preis: "6,80 €", text: "Gulasch mit Spätzle" },
  rouladen: { bild: "Gerichte/rouladen.jpg", preis: "8,50 €", text: "Rouladen mit Spätzle" },
  backfisch: { bild: "Gerichte/backfisch.jpg", preis: "6,80 €", text: "Backfisch mit Kartoffelsalat" },
  spaghetti: { bild: "Gerichte/spaghetti.jpg", preis: "6,80 €", text: "Spaghetti Bolognese" },
  backschinken: { bild: "Gerichte/backschinken.jpg", preis: "8,50 €", text: "Backschinken mit Kartoffelsalat" },
  zwiebelrostbraten: { bild: "Gerichte/zwiebelrostbraten.jpg", preis: "10,50 €", text: "Zwiebelrostbraten mit Spätzle" },
  lende: { bild: "Gerichte/lende.jpg", preis: "8,50 €", text: "Lende mit Rahmsauce und Spätzle" },
  kuemmelbraten: { bild: "Gerichte/kuemmelbraten.jpg", preis: "8,50 €", text: "Kümmelbraten mit Semmelknödel" },
  currywurst: { bild: "Gerichte/currywurst.jpg", preis: "6,80 €", text: "Currywurst mit Semmel" },
  hackbraten: { bild: "Gerichte/hackbraten.jpg", preis: "8,50 €", text: "Hackbraten mit Kartoffeln und Gemüse" },
  karpfenfilet: { bild: "Gerichte/karpfenfilet.jpg", preis: "8,50 €", text: "Karpfenfilet mit Kartoffelsalat" },
  krautwickel: { bild: "Gerichte/krautwickel.jpg", preis: "8,50 €", text: "Krautwickel mit Kartoffeln" },
  lasagne: { bild: "Gerichte/lasagne.jpg", preis: "6,80 €", text: "Lasagne" },
  spareribs: { bild: "Gerichte/spareribs.jpg", preis: "6,80 €", text: "Sparerips mit Wedges" },
  saschliktopf: { bild: "Gerichte/schaschliktopf.jpg", preis: "6,80 €", text: "Schaschliktopf mit Semmel" },
  
  rindfleisch_meerrettich: { bild: "Gerichte/rindfleisch_meerrettich.jpg", preis: "8,50 €", text: "Rindfleisch mit Kartoffelsalat und Meerrettich" }
}

const kunden = {
  sorgundseitz: {
    name: "Metzgerei Sorg & Seitz",
    layouts: ["mittagstisch", "catering"]
  },

  schilling: {
    name: "Motorrad Schilling",
    layouts: ["event"]
  },

  erkenbrecher: {
    name: "Schreinerei Erkenbrecher",
    layouts: ["referenzen"]
  },
  metzgereigoetz: {
    name: "Metzgerei Götz",
    layouts: ["mittagstisch"]
}
}


const kundenGerichte = {
  sorgundseitz: standardGerichte,
  schilling: {},
  erkenbrecher: {},
  metzgereigoetz: standardGerichte
}

const kundenLayouts = {
  sorgundseitz: {
    mittagstisch_instagram: {
      feed: {
        template: "templates/klassisch-feed.jpg",
        width: 1080,
        height: 1350,
        woche: { x: 630, y: 180, fontSize: 54 },
        meals: {
          dienstag: {
            imageX: 314, imageY: 469, imageRadius: 82,
            textX: 314, textY: 640, textMaxWidth: 360, textLineHeight: 30,
            priceX: 315, priceY: 762, priceColor: "#ffffff",
            textFontSize: 28, priceFontSize: 30
          },
          mittwoch: {
            imageX: 767, imageY: 479, imageRadius: 82,
            textX: 772, textY: 640, textMaxWidth: 360, textLineHeight: 30,
            priceX: 772, priceY: 762, priceColor: "#2f2f2f",
            textFontSize: 28, priceFontSize: 30
          },
          donnerstag: {
            imageX: 315, imageY: 894, imageRadius: 82,
            textX: 315, textY: 1070, textMaxWidth: 360, textLineHeight: 30,
            priceX: 315, priceY: 1188, priceColor: "#2f2f2f",
            textFontSize: 28, priceFontSize: 30
          },
          freitag: {
            imageX: 767, imageY: 893, imageRadius: 82,
            textX: 770, textY: 1070, textMaxWidth: 360, textLineHeight: 30,
            priceX: 768, priceY: 1188, priceColor: "#ffffff",
            textFontSize: 28, priceFontSize: 30
          }
        }
      },

      story: {
        template: "templates/klassisch-story.jpg",
        width: 1080,
        height: 1920,
        woche: { x: 660, y: 310, fontSize: 65 },
        meals: {
          dienstag: {
            imageX: 300, imageY: 712, imageRadius: 105,
            textX: 300, textY: 935, textMaxWidth: 400, textLineHeight: 30,
            priceX: 300, priceY: 1087, priceColor: "#ffffff",
            textFontSize: 32, priceFontSize: 32
          },
          mittwoch: {
            imageX: 805, imageY: 711, imageRadius: 105,
            textX: 810, textY: 935, textMaxWidth: 400, textLineHeight: 30,
            priceX: 810, priceY: 1085, priceColor: "#2f2f2f",
            textFontSize: 32, priceFontSize: 32
          },
          donnerstag: {
            imageX: 300, imageY: 1275, imageRadius: 105,
            textX: 300, textY: 1500, textMaxWidth: 400, textLineHeight: 30,
            priceX: 300, priceY: 1650, priceColor: "#2f2f2f",
            textFontSize: 32, priceFontSize: 32
          },
          freitag: {
            imageX: 805, imageY: 1275, imageRadius: 105,
            textX: 810, textY: 1500, textMaxWidth: 400, textLineHeight: 30,
            priceX: 810, priceY: 1650, priceColor: "#ffffff",
            textFontSize: 32, priceFontSize: 32
          }
        }
      }
    },

    mittagstisch_druck: {
      front: {
        template: "templates/mittagstisch-print-front.jpg",
        width: 3508,
        height: 2480,
        datum: {
          x: 2920,
          y: 350,
          fontSize: 100
        }
      },

      back: {
        template: "templates/mittagstisch-print-back.jpg",
        width: 3508,
        height: 2480,

        links: {
          woche: { x: 990, y: 250, fontSize: 90 },
          meals: {
            dienstag: {
              imageX: 477, imageY: 540, imageRadius: 145,
              textX: 475, textY: 880, textMaxWidth: 420, textLineHeight: 54,
              priceX: 475, priceY: 1120, priceColor: "#ffffff",
              textFontSize: 56, priceFontSize: 60
            },
            mittwoch: {
              imageX: 1310, imageY: 540, imageRadius: 145,
              textX: 1310, textY: 880, textMaxWidth: 420, textLineHeight: 54,
              priceX: 1315, priceY: 1120, priceColor: "#2f2f2f",
              textFontSize: 56, priceFontSize: 60
            },
            donnerstag: {
              imageX: 477, imageY: 1335, imageRadius: 145,
              textX: 475, textY: 1700, textMaxWidth: 420, textLineHeight: 54,
              priceX: 475, priceY: 1970, priceColor: "#2f2f2f",
              textFontSize: 56, priceFontSize: 60
            },
            freitag: {
              imageX: 1310, imageY: 1335, imageRadius: 145,
              textX: 1310, textY: 1700, textMaxWidth: 420, textLineHeight: 54,
              priceX: 1240, priceY: 2050, priceColor: "#ffffff",
              textFontSize: 56, priceFontSize: 60
            }
          }
        },

        rechts: {
          woche: { x: 2750, y: 250, fontSize: 90 },
          meals: {
            dienstag: {
              imageX: 2184, imageY: 530, imageRadius: 145,
              textX: 2180, textY: 880, textMaxWidth: 420, textLineHeight: 54,
              priceX: 2180, priceY: 1125, priceColor: "#ffffff",
              textFontSize: 56, priceFontSize: 60
            },
            mittwoch: {
              imageX: 3007, imageY: 540, imageRadius: 145,
              textX: 3015, textY: 880, textMaxWidth: 420, textLineHeight: 54,
              priceX: 3020, priceY: 1125, priceColor: "#2f2f2f",
              textFontSize: 56, priceFontSize: 60
            },
            donnerstag: {
              imageX: 2190, imageY: 1335, imageRadius: 145,
              textX: 2190, textY: 1700, textMaxWidth: 420, textLineHeight: 54,
              priceX: 2180, priceY: 1970, priceColor: "#2f2f2f",
              textFontSize: 56, priceFontSize: 60
            },
            freitag: {
              imageX: 3025, imageY: 1335, imageRadius: 145,
              textX: 3015, textY: 1700, textMaxWidth: 420, textLineHeight: 54,
              priceX: 3020, priceY: 1970, priceColor: "#ffffff",
              textFontSize: 56, priceFontSize: 60
            }
          }
        }
      }
    }
  }

}

kundenLayouts.metzgereigoetz = JSON.parse(JSON.stringify(kundenLayouts.sorgundseitz))

kundenLayouts.metzgereigoetz.tagesgerichte_feed_text = {
  feed: {
    template: "templates/goetz-tagesgerichte-feed.jpg",
    width: 1080,
    height: 1080,

    tage: {
      montag: {
        titleX: 70,
        titleY: 170,
        titleFontSize: 30,

        meal1X: 70,
        meal1Y: 230,
        price1X: 950,
        price1Y: 220,

        meal2X: 70,
        meal2Y: 280,
        price2X: 950,
        price2Y: 265,

        meal3X: 70,
        meal3Y: 330,
        price3X: 950,
        price3Y: 310
      },

      dienstag: {
        titleX: 70,
        titleY: 390,
        titleFontSize: 30,

        meal1X: 70,
        meal1Y: 440,
        price1X: 950,
        price1Y: 440,

        meal2X: 70,
        meal2Y: 485,
        price2X: 950,
        price2Y: 485,

        meal3X: 70,
        meal3Y: 530,
        price3X: 950,
        price3Y: 530
      },

      mittwoch: {
        titleX: 70,
        titleY: 610,
        titleFontSize: 30,

        meal1X: 70,
        meal1Y: 660,
        price1X: 950,
        price1Y: 660,

        meal2X: 70,
        meal2Y: 705,
        price2X: 950,
        price2Y: 705,

        meal3X: 70,
        meal3Y: 750,
        price3X: 950,
        price3Y: 750
      },

      donnerstag: {
        titleX: 70,
        titleY: 830,
        titleFontSize: 30,

        meal1X: 70,
        meal1Y: 880,
        price1X: 950,
        price1Y: 880,

        meal2X: 70,
        meal2Y: 925,
        price2X: 950,
        price2Y: 925,

        meal3X: 70,
        meal3Y: 970,
        price3X: 950,
        price3Y: 970
      },

      freitag: {
        titleX: 70,
        titleY: 1050,
        titleFontSize: 30,

        meal1X: 70,
        meal1Y: 1100,
        price1X: 950,
        price1Y: 1100,

        meal2X: 70,
        meal2Y: 1145,
        price2X: 950,
        price2Y: 1145,

        meal3X: 70,
        meal3Y: 1190,
        price3X: 950,
        price3Y: 1190
      }
    }
  }
}

const generatorVorlagen = {
  sorgundseitz: {
    mittagstisch_instagram: {
      name: "Mittagstisch Instagram",
      layout: "mittagstisch_instagram",
      formats: ["story", "feed"]
    },
    mittagstisch_druck: {
      name: "Mittagstisch A4 Druck",
      layout: "mittagstisch_druck",
      formats: ["front", "back"]
    }
  },

  schilling: {},

  erkenbrecher: {},

   metzgereigoetz: {
    tagesgerichte_feed_text: {
     name: "Tagesgerichte Feed",
     layout: "tagesgerichte_feed_text",
     formats: ["feed"]
  }
}
}
