let cart = [];

// Predefined items
let items =
[
  {
    "name": "A202",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CHIVIO","DYB","JETBLK","OLVNT","SURSPR"],
    "colorname": ["CHIVIO : CHINESE VIOLET, 899,989","DYB : DRY BLOOD, 899,989","JETBLK : JET BLACK, 899,989","OLVNT : OLIVE NIGHT, 899,989","SURSPR : SURF SPRAY, 899,989"]
  },
  {
    "name": "A203",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CHM","DUSOR","PASTUR"],
    "colorname": ["CHM : CHARCOAL MELANGE, 1399,1539","DUSOR : DUSKY ORCHID, 1399,1539","PASTUR : Pastel Turquoise, 1399,1539"]
  },
  {
    "name": "A204",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["MBCAOP","SSAAOP"],
    "colorname": ["MBCAOP : MEDIEVAL BLUE CRACKLE AOP, 1049,1149","SSAAOP : SURF SPRAY ABSTRACT AOP, 1049,1149"]
  },
  {
    "name": "A301",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["ABG","BRWSTG","GBG","MBNGUG"],
    "colorname": ["ABG : APRICOTPIE/BEHERENOW, 999,1099","BRWSTG : BRIGHT WHITE STRONGER GRAPHICS, 999,1099","GBG : GRN PEAR/BREATHE, 899,989","MBNGUG : MEDIEVAL BLUE NEVER GIVE UP GRAPHICS, 999,1099"]
  },
  {
    "name": "A303",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JBSG","NVYSGR"],
    "colorname": ["JBSG : JET BLK/SWEAT, 899,989","NVYSGR : NAVY/SWEAT GRAPHIC, 899,989"]
  },
  {
    "name": "A304",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["DBW","JBRL","PSW","SAW","TEX"],
    "colorname": ["DBW : DRY BLOOD/RELAX, 1299,1399","JBRL : JET BLK/RELAX, 1299,1399","PSW : PURPLE SLATE/RELAX, 1299,1399","SAW : SOFT AQUA/RELAX, 1299,1399","TEX : THAI GREEN/RELAX, 1299,1399"]
  },
  {
    "name": "A306",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CRMBG","JETBLK","JTBBGR","MMMBG","NVMEL","NVMGFG"],
    "colorname": ["CRMBG : CASTLEROCK MELANGE BELIVE GRAPHIC, 1199,1299","JETBLK : JET BLACK, 1199,1299","JTBBGR : JET BLACK BELIVE GRAPHIC, 1199,1299","MMMBG : MUSKMELON MELANGE BELIVE GRAPHIC, 1199,1299","NVMEL : NAVY MELANGE, 1199,1299","NVMGFG : NAVY MELANGE GRATEFUL GRAPHIC, 1199,1299"]
  },
  {
    "name": "A309",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BBMARG","BLKMLG","DOMARG","NVYAR","OLMAR"],
    "colorname": ["BBMARG : BLUE BELL MELANGE ACTIVE REFLECTIVE GRAPHIC, 649,699","BLKMLG : BLACK MELANGE - ACTIVE REFLECTIVE, 649,699","DOMARG : DUSKY ORCHID MELANGE ACTIVE REFLECTIVE GRAPHIC, 649,699","NVYAR : NAVY MELANGE - ACTIVE REFLECTIVE, 649,699","OLMAR : OLIVE MELANGE - ACTIVE REFLECTIVE, 649,699"]
  },
  {
    "name": "A310",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CHM","LVML","NVMEL","OLVMEL"],
    "colorname": ["CHM : CHARCOAL MELANGE, 999,1049","LVML : LAVENDER MELANGE, 999,1049","NVMEL : NAVY MELANGE, 999,1049","OLVMEL : OLIVE MELANGE, 999,1049"]
  },
  {
    "name": "A311",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JBFEGR","LVCAGR","PPFEGR","SSCAGR"],
    "colorname": ["JBFEGR : JET BLACK FOREVER GRAPHIC, 599,649","LVCAGR : LAVENDER CALM GRAPHIC, 599,649","PPFEGR : PEACH PARFAIT FOREVER GRAPHIC, 599,649","SSCAGR : SURF SPRAY CALM GRAPHIC, 599,649"]
  },
  {
    "name": "A312",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["DUSOR","JETBLK","ROUGE","TRDWIN"],
    "colorname": ["DUSOR : DUSKY ORCHID, 899,949","JETBLK : JET BLACK, 899,949","ROUGE : ROUGE, 899,949","TRDWIN : TRADEWIND, 899,949"]
  },
  {
    "name": "A401",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["DYB","GRKBLU","OLVNT","TGN"],
    "colorname": ["DYB : DRY BLOOD, 1499,1599","GRKBLU : GREEK BLUE, 1499,1599","OLVNT : OLIVE NIGHT, 1499,1599","TGN : THAI GREEN, 1499,1599"]
  },
  {
    "name": "A402",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CHOCOF","CSTR","JETBLK","NAVY","OLVNT","ROUGE"],
    "colorname": ["CHOCOF : Choco Fudge, 1499,1649","CSTR : CASTLE ROCK, 1499,1649","JETBLK : JET BLACK, 1499,1649","NAVY : NAVY, 1499,1649","OLVNT : OLIVE NIGHT, 1499,1649","ROUGE : ROUGE, 1499,1649"]
  },
  {
    "name": "A404",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BBELL","JETBLK","ROUGE","SURSPR"],
    "colorname": ["BBELL : BLUE BELL, 1699,1869","JETBLK : JET BLACK, 1699,1869","ROUGE : ROUGE, 1699,1869","SURSPR : SURF SPRAY, 1699,1869"]
  },
  {
    "name": "A406",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JETBLK","OLIVE","PURHAZ"],
    "colorname": ["JETBLK : JET BLACK, 1399,1549","OLIVE : OLIVE, 1399,1549","PURHAZ : PURPLE HAZE, 1399,1549"]
  },
  {
    "name": "A601",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["DYB","OLVNT"],
    "colorname": ["DYB : DRY BLOOD, 1899,1999","OLVNT : OLIVE NIGHT, 1899,1999"]
  },
  {
    "name": "A602",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["DBS","DTSSTP","JBSS","ONSSTR"],
    "colorname": ["DBS : DRYBLOOD SOLO STRIPE, 1649,1799","DTSSTP : DEEP TEAL SOLO STRIPE, 1649,1799","JBSS : JETBLACK SOLO STRIPE, 1649,1799","ONSSTR : OLIVNGT SOLO STRIPE, 1649,1799"]
  },
  {
    "name": "A603",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["DYB","OLVNT"],
    "colorname": ["DYB : DRY BLOOD, 1699,1869","OLVNT : OLIVE NIGHT, 1699,1869"]
  },
  {
    "name": "A604",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CHM","PASTUR"],
    "colorname": ["CHM : CHARCOAL MELANGE, 1699,1869","PASTUR : Pastel Turquoise, 1699,1869"]
  },
  {
    "name": "A605",
    "sizes": ["XS","S","M","L","XL","XXL"],
    "colors": ["CSTR","DUSOR","DYB","GOBBLU","GULGRE","JETBLK","NAVY","OLVNT"],
    "colorname": ["CSTR : CASTLE ROCK, 999,1049","DUSOR : DUSKY ORCHID, 999,1049","DYB : DRY BLOOD, 999,1049","GOBBLU : Goblin Blue, 999,1049","GULGRE : GULL GREY, 999,1049","JETBLK : JET BLACK, 999,1049","NAVY : NAVY, 999,1049","OLVNT : OLIVE NIGHT, 999,1049"]
  },
  {
    "name": "A607",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["MBCAOP","SSAAOP"],
    "colorname": ["MBCAOP : MEDIEVAL BLUE CRACKLE AOP, 1299,1429","SSAAOP : SURF SPRAY ABSTRACT AOP, 1299,1429"]
  },
  {
    "name": "A609",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BSDMEL","IPSDML","RFSDML"],
    "colorname": ["BSDMEL : BLACK SPACE DYE MELANGE, 1399,1549","IPSDML : IMPERIAL PURPLE SPACE DYED MELANGE, 1399,1549","RFSDML : RAIN FORST SPACE DYED MELANGE, 1399,1549"]
  },
  {
    "name": "A704",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BLKMEL","NVMEL"],
    "colorname": ["BLKMEL : BLACK MELANGE, 699,749","NVMEL : NAVY MELANGE, 699,749"]
  },
  {
    "name": "A901",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["DYB","JETBLK","NAVY","OLVNT"],
    "colorname": ["DYB : DRY BLOOD, 2599,2699","JETBLK : JET BLACK, 2599,2699","NAVY : NAVY, 2599,2699","OLVNT : OLIVE NIGHT, 2599,2699"]
  },
  {
    "name": "A903",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BBDAPR","CMG","JETBLK","MEGRME","NAVY","OLVNT","OMM"],
    "colorname": ["BBDAPR : Brabdied Apricot, 2399,2499","CMG : CHAMBRAY MELANGE, 2399,2499","JETBLK : JET BLACK, 2399,2499","MEGRME : MEDIUM GREY MELANGE, 2399,2499","NAVY : NAVY, 2399,2499","OLVNT : OLIVE NIGHT, 2399,2499","OMM : OAT MEAL MELANGE, 2399,2499"]
  },
  {
    "name": "A905",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BLBMGR","JBSUGR","ROSUGR","SUSMGR"],
    "colorname": ["BLBMGR : BLUE BELL MAGIC GRAPHIC, 1699,1849","JBSUGR : JET BLACK SET UP GRAPHIC, 1699,1849","ROSUGR : ROUGE SET UP GRAPHIC, 1699,1849","SUSMGR : SURF SPRAY MAGIC GRAPHIC, 1699,1849"]
  },
  {
    "name": "A906",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JETBLK","OLIVE","PURHAZ"],
    "colorname": ["JETBLK : JET BLACK, 1599,1749","OLIVE : OLIVE, 1599,1749","PURHAZ : PURPLE HAZE, 1599,1749"]
  },
  {
    "name": "E014",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["ARMGRN","CCM","CSTR","DULFOR","DUSOR","JETBLK","MGM","NAVY","TGTCA"],
    "colorname": ["ARMGRN : ARMY GREEN, 939,1039","CCM : CHARCOALMELANGE, 939,1039","CSTR : CASTLE ROCK, 939,1039","DULFOR : Dull Forest, 939,1039","DUSOR : DUSKY ORCHID, 939,1039","JETBLK : JET BLACK, 939,1039","MGM : MEDIUMGREY MELANGE, 939,1039","NAVY : NAVY, 939,1039","TGTCA : THAIGRNCIR\TERRACOT, 939,1039"]
  },
  {
    "name": "E018",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CCM","JETBLK","MGM","NAVY"],
    "colorname": ["CCM : CHARCOALMELANGE, 899,989","JETBLK : JET BLACK, 899,989","MGM : MEDIUMGREY MELANGE, 899","NAVY : NAVY, 899,989"]
  },
  {
    "name": "E040",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["AABC","GAOPNC","JNGCOC","NSKNCO"],
    "colorname": ["AABC : ABT ANIMAL BLK CMB, 1699,1799","GAOPNC : GALAXY AOP NAVY COMBO, 1699,1799","JNGCOC : JUNGLE CAMO OLIVE COMBO, 1699,1799","NSKNCO : NEW SKIN AOP NAVY, 1699,1799"]
  },
  {
    "name": "E044",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CCM","JETBLK","MGM","NAVY"],
    "colorname": ["CCM : CHARCOALMELANGE, 799","JETBLK : JET BLACK, 799,879","MGM : MEDIUMGREY MELANGE, 799","NAVY : NAVY, 799,879"]
  },
  {
    "name": "E047",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JBK","LMNCRM","MGM","NAVY","SFBEI"],
    "colorname": ["JBK : JETBLACK, 549,599","LMNCRM : LEMON CREAM, 549,599","MGM : MEDIUMGREY MELANGE, 549,599","NAVY : NAVY, 549,599","SFBEI : SOFT BEIGE, 549,599"]
  },
  {
    "name": "E048",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["ACA","ARMGAA","BSBAOP","CBPAOP","CSTR","DUFAOP","DUSOR","ELMGRN","JBPAOP","JETBLK","MBDAOP","MBTAOP","NAVY","NVUHBA","PRPLDA","RAIFOR","ROUGE","WABAOP"],
    "colorname": ["ACA : ASH CELTIC AOP, 1049,1159","ARMGAA : ARMYGREEN ARROWHEAD AOP, 1049,1159","BSBAOP : BRAZILLIAN SANDBOUQUET AOP, 1049,1159","CBPAOP : CORNFLOWER BLUEPOPPY AOP, 1049,1159","CSTR : CASTLE ROCK, 1049,1159","DUFAOP : DUSKY ORCHID FLOWER BUNCH AOP, 1049,1159","DUSOR : DUSKY ORCHID, 1049,1159","ELMGRN : ELM GREEN, 1049,1159","JBPAOP : JET BLACK PAINTED LEAVES AOP, 1049,1159","JETBLK : JET BLACK, 1049,1159","MBDAOP : MEDIEVAL BLUE DIAMOND AOP, 1049,1159","MBTAOP : MEDIEVAL BLUETIE DYE AOP, 1049,1159","NAVY : NAVY, 1049,1159","NVUHBA : NAVY HIBISCUS AOP, 1049","PRPLDA : PURPLE DASH AOP, 1049,1159","RAIFOR : RAIN FOREST, 1049,1159","ROUGE : ROUGE, 1049,1159","WABAOP : WHITE ABSTRACT AOP, 1049,1159"]
  },
  {
    "name": "E057",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JETBLK","MGM","NAVY","PCHPAR","RAIFOR","SURSPR"],
    "colorname": ["JETBLK : JET BLACK, 699,769","MGM : MEDIUMGREY MELANGE, 699,769","NAVY : NAVY, 699,769","PCHPAR : PEACH PARAFAIT, 699,769","RAIFOR : RAIN FOREST, 699,769","SURSPR : SURF SPRAY, 699,769"]
  },
  {
    "name": "E060",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CAPMEL","CH MEL","DBY MEL","DUSOR","JETBLK","MDB","MGM","NVMEL"],
    "colorname": ["CAPMEL : CAPPUCCINO MELANGE, 1249,1349","CH MEL : CHARCOAL MELANGE, 1249,1349","DBY MEL : DEEP RUBY, 1249,1349","DUSOR : DUSKY ORCHID, 1249,1349","JETBLK : JET BLACK, 1249,1349","MDB : MEDIEVAL BLUE, 1249,1349","MGM : MEDIUMGREY MELANGE, 1249,1349","NVMEL : NAVY MELANGE, 1249,1349"]
  },
  {
    "name": "E061",
    "sizes": ["M","L","XL","XXL"],
    "colors": ["NVYRG","PURRIG","RGS","TGS"],
    "colorname": ["NVYRG : NAVY/RISE GRAPHIC, 849","PURRIG : PURPLE SLATE/RISE, 849","RGS : ROUGE/SHINE, 849","TGS : THAI GREEN/SHINE, 849"]
  },
  {
    "name": "E062",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BALGRN","BR0","BSA","CHVRAP","CSRSAP","DFTPAP","EBTDAP","FMA","JETBLK","NSF","RVA"],
    "colorname": ["BALGRN : BALI GREEN, 649,719","BR0 : BLACK RINGS AOP, 699,779","BSA : BALI SPLASH AOP, 699,779","CHVRAP : CHINESE VIOLET ROSE AOP, 699,769","CSRSAP : CASTLE ROCK SQUARE AOP, 699,769","DFTPAP : DULL FOREST TROPICAL PALM AOP, 699,769","EBTDAP : ELEMENTAL BLUE TINY DIAMOND AOP, 699,769","FMA : FERN DIAMOND AOP, 699,779","JETBLK : JET BLACK, 649,719","NSF : NAVY SCATTER FLORA, 699","RVA : ROUGE VINE AOP, 699"]
  },
  {
    "name": "E064",
    "sizes": ["S","M","L","XL"],
    "colors": ["AGY","DBY","JETBLK"],
    "colorname": ["AGY : ASH GREY, 1149","DBY : DEEP RUBY, 1149","JETBLK : JET BLACK, 1149"]
  },
  {
    "name": "E066",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["ARMGRN","CCM","JETBLK","MGM","MHGN","NAVY"],
    "colorname": ["ARMGRN : ARMY GREEN, 1049,1149","CCM : CHARCOALMELANGE, 1049,1149","JETBLK : JET BLACK, 1049,1149","MGM : MEDIUMGREY MELANGE, 1049,1149","MHGN : MAHOGANY, 1049","NAVY : NAVY, 1049"]
  },
  {
    "name": "E068",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BLKMEL","CHIVIO","CSTR","ELMGRN","JETBLK","MDB","NAVY","OLVNT","PURHAZ","ROUGE"],
    "colorname": ["BLKMEL : BLACK MELANGE, 1799,1979","CHIVIO : CHINESE VIOLET, 1799,1979","CSTR : CASTLE ROCK, 1799,1979","ELMGRN : ELM GREEN, 1799,1979","JETBLK : JET BLACK, 1799,1979","MDB : MEDIEVAL BLUE, 1799,1979","NAVY : NAVY, 1799,1979","OLVNT : OLIVE NIGHT, 1799,1979","PURHAZ : PURPLE HAZE, 1799,1979","ROUGE : ROUGE, 1799,1979"]
  },
  {
    "name": "E076",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BLKMEL","DCT","JETBLK","NAVY"],
    "colorname": ["BLKMEL : BLACK MELANGE, 1899,2099","DCT : DARK CHOCOLATE, 1899,2099","JETBLK : JET BLACK, 1899,2099","NAVY : NAVY, 1899,2099"]
  },
  {
    "name": "E078",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JETBLK","NAVY","ROSWTR","TGN"],
    "colorname": ["JETBLK : JET BLACK, 749,829","NAVY : NAVY, 749,829","ROSWTR : ROSE WATER, 749","TGN : THAI GREEN, 749"]
  },
  {
    "name": "E079",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["AGHG","AGNG","BBMG","DBNG","DOEG","JBHNG","NVBHN","PSBHNG"],
    "colorname": ["AGHG : ASH GREY/BEHERENOW, 1199,1299","AGNG : ARMYGREEN/BEHERENOW, 1199,1299","BBMG : BLUE BELL/MAGIC GRAPHIC, 1199,1299","DBNG : DRY BLOOD/BEHERENOW, 1199,1299","DOEG : DUSKY ORCHID/ENOUGH GRAPHIC, 1199,1299","JBHNG : JET BLK/BE HERE NOW, 1199,1299","NVBHN : NAVY/BE HERE NOW, 1199,1299","PSBHNG : PURPSLATE/BEHERENOW, 1199,1299"]
  },
  {
    "name": "E080",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["ARMGRN","JETBLK","MGM","NAVY","PDRBLU","ROUGE"],
    "colorname": ["ARMGRN : ARMY GREEN, 799","JETBLK : JET BLACK, 799","MGM : MEDIUMGREY MELANGE, 799,889","NAVY : NAVY, 799,889","PDRBLU : POWDER BLUE, 799","ROUGE : ROUGE, 799"]
  },
  {
    "name": "E089",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BLMMRG","CVMMRG","GGMMRG","GMX"],
    "colorname": ["BLMMRG : BLACKMELANGE/MATRIX REFLECTIVEGRAPHIC, 649,719","CVMMRG : CHNIESE VIOLETMELANGE/MATRIX REFLECTIVEGRAPHIC, 649,719","GGMMRG : GULL GREYMELANGE/MATRIX REFLECTIVEGRAPHIC, 649,719","GMX : GREEKBLUEMEL/MATRIX, 649,719"]
  },
  {
    "name": "E121",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JETBLK","NAVY","SOFTPI"],
    "colorname": ["JETBLK : JET BLACK, 1349","NAVY : NAVY, 1349,1449","SOFTPI : SOFT PINK, 1349"]
  },
  {
    "name": "E123",
    "sizes": ["S","M","L","XL"],
    "colors": ["NAVY"],
    "colorname": ["NAVY : NAVY, 1199"]
  },
  {
    "name": "E147",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CFBDDG","CHVLEG","ELGDDG","IHP","MHR","RLG"],
    "colorname": ["CFBDDG : CBLUE DREAMER GRAPHICS, 699,769","CHVLEG : CHIVIOLET LMT EDT GR, 699,769","ELGDDG : ELGR DAY DREAMER GR, 699,769","IHP : IVORY/HAMSA GRAPHIC, 699","MHR : MAUVE PINK/HAMSA, 699,769","RLG : ROSE WATER/LIMIT, 699"]
  },
  {
    "name": "E157",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["AYRGR","JBRGR","LCPE","MBEGR","MGMBE","NYPC","PPEGR","RFFGR","RWLY","SPFGR"],
    "colorname": ["AYRGR : AMBER YELLOW REAL, 799,879","JBRGR : JET BLACK REAL GRAPHIC, 799,879","LCPE : LEMON CREAM/PEACE, 799,879","MBEGR : MEDIVAL BLUE ENOUGH, 799,879","MGMBE : M.GRYMEL/HAMSAENARGY, 799,879","NYPC : NAVY/ PEACE, 799,879","PPEGR : PEACH PARFAIT ENOUGH, 799,879","RFFGR : RAIN FOREST FLAWLESS, 799,879","RWLY : ROSEWATR/LOTUSYOGINI, 799,879","SPFGR : SURF SPRAY FLAWLESS, 799,879"]
  },
  {
    "name": "E161",
    "sizes": ["M","L","XL","XXL"],
    "colors": ["JBRS","NRNS","PLH"],
    "colorname": ["JBRS : JET BLK/RISE- SHINE, 999","NRNS : NAVY/RISE /SHINE, 999","PLH : PURSLATE/ RISE SHINE, 999"]
  },
  {
    "name": "E247",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["LCDA","LIWA","PSBAOP","ROBIAO","SAWA"],
    "colorname": ["LCDA : LEMON CREAM DEER AOP, 729,799","LIWA : LILAC IRIS WHALE AOP, 729","PSBAOP : PURPLE SLATEBIRD AOP, 729","ROBIAO : ROSEWATER BIRD AOP, 729","SAWA : SOFT AQUA WHALE AOP, 729"]
  },
  {
    "name": "E257",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BBDAOP","BRWDAP","MBSAOP","RFSCP","ROSSTP","SSSBTP","TGBFAP"],
    "colorname": ["BBDAOP : BLUE BELL DITSY AOP, 829,899","BRWDAP : Bright white-dandelion aop, 829,899","MBSAOP : MED BLUE SEMI CIRCLE, 829,899","RFSCP : RAIN FOREST SEMI CIRCLE, 829,899","ROSSTP : ROUGE BUTTERFLY, 829,899","SSSBTP : SURF SPRAY BUTTERFLY, 829,899","TGBFAP : Tangerine-butterfly aop, 829,899"]
  },
  {
    "name": "E305",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["AMY","ELMGRN","JETBLK"],
    "colorname": ["AMY : AMBER YELLOW, 649,699","ELMGRN : ELM GREEN, 649,699","JETBLK : JET BLACK, 649,699"]
  },
  {
    "name": "E306",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["DFMDUF","EBMELB","MGMBLK","ROMROU"],
    "colorname": ["DFMDUF : DULL FOREST MELANGE/DULL FOREST, 549,599","EBMELB : ELEMENTAL BLUE MEL/ ELEMENTAL BLUE, 549,599","MGMBLK : MEDIUM GREY MEL/ BLACK, 549,599","ROMROU : ROUGE MEL/ ROUGE, 549,599"]
  },
  {
    "name": "E307",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BLABRW","FIMDRB","LGMSPB"],
    "colorname": ["BLABRW : Black/Bright White, 749,799","FIMDRB : Forged Iron Melange/Dry Blood, 749,799","LGMSPB : Light Grey Melange/Space Blue, 749,799"]
  },
  {
    "name": "E309",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CSTR","JETBLK","RAIFOR","ROUGE"],
    "colorname": ["CSTR : CASTLE ROCK, 899,949","JETBLK : JET BLACK, 899,949","RAIFOR : RAIN FOREST, 899,949","ROUGE : ROUGE, 899,949"]
  },
  {
    "name": "E3G4",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BBPVGR","ELBLMG","JBLTGR","JBRTWG","RFGRGR","ROSSGR"],
    "colorname": ["BBPVGR : BLUE BELL POSITIVE VIBES GRAPHIC, 899,949","ELBLMG : ELEMENTAL BLUE MAGIC GRAPHICS, 899,949","JBLTGR : JET BLACK LTD EDITION GRAPHIC, 899,949","JBRTWG : JET BLACK RIDE THE WAVE GRAPHIC, 899,949","RFGRGR : RAIN FOREST GRACEFUL GRAPHIC, 899,949","ROSSGR : ROUGE STAY STRONG GRAPHIC, 899,949"]
  },
  {
    "name": "E3G5",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["LAVEGR","MAREGR","REOEGR","ROUEGR"],
    "colorname": ["LAVEGR : LAVENDER EXPECT GRAPHIC, 799,849","MAREGR : MARMALADE EXPECT GRAPHIC, 799,849","REOEGR : RED OCHRE EASY GRAPHIC, 799,849","ROUEGR : ROUGE EASY GRAPHIC, 799,849"]
  },
  {
    "name": "E403",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BLKMEL","DUFOME","MEBLME"],
    "colorname": ["BLKMEL : BLACK MELANGE, 1299,1429","DUFOME : DULL FOREST MELANGE, 1299,1429","MEBLME : MEDIEVAL BLUE MELANGE, 1299,1429"]
  },
  {
    "name": "E405",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BBELL","BLKMEL","MDBMEL","REOC"],
    "colorname": ["BBELL : BLUE BELL, 1699,1849","BLKMEL : BLACK MELANGE, 1699,1849","MDBMEL : MEDIEVAL BLUE MEL, 1699,1849","REOC : Red Ochre, 1699,1849"]
  },
  {
    "name": "E406",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["DUSOR","JETBLK","MDB","OLIVE"],
    "colorname": ["DUSOR : DUSKY ORCHID, 1499,1649","JETBLK : JET BLACK, 1499,1649","MDB : MEDIEVAL BLUE, 1499,1649","OLIVE : OLIVE, 1499,1649"]
  },
  {
    "name": "E4A3",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BLKBAO","NHO","RBNBA","RGA","SFPBPA","SFTGBA"],
    "colorname": ["BLKBAO : BLACK BLING AOP, 1249,1349","NHO : NAVY HOUNDS AOP, 1249,1349","RBNBA : ROBIN BLOCK AOP, 1249,1349","RGA : ROUGE GARDEN AOP, 1249","SFPBPA : SOFT PINK BLOCK PRINT AOP, 1249,1349","SFTGBA : SOFT GREEN BLING AOP, 1249,1349"]
  },
  {
    "name": "E4A4",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BKSPRA","DCHKCA","JNGLAO","OLPSLA","PRPLIN"],
    "colorname": ["BKSPRA : BLACK SPRAY AOP, 1149,1249","DCHKCA : DARK CHOCOLATE CHAIN AOP, 1149,1249","JNGLAO : JUNGLE GREEN LEAFY AOP, 1149,1249","OLPSLA : OLIVE PAISLEY AOP, 1149,1249","PRPLIN : PURPEL INDIE AOP, 1149,1249"]
  },
  {
    "name": "E4A5",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BRBLCH","DFPAOP","FPGAOP","ORHUCH","PBTAOP","ROUGCH"],
    "colorname": ["BRBLCH : BRUNNERA BLUECHECKS, 949,999","DFPAOP : DULLFOREST PW AOP, 949,999","FPGAOP : FND PINK GARDEN FLR AOP, 949,999","ORHUCH : ORCHID HUSHCHECKS, 949,999","PBTAOP : PBLUE TROPICAL LVS AOP, 949,999","ROUGCH : ROUGE CHECKS, 949,999"]
  },
  {
    "name": "E7A1",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BOTSTK","FPGAOP","IVYSTR","MTLAOP","PBTAOP","PLEVPD"],
    "colorname": ["BOTSTK : BOTANICAL STROKES AOP, 699,749","FPGAOP : FND PINK GARDEN FLR AOP, 699,749","IVYSTR : IVORY STRIPE, 699","MTLAOP : MULTICOLOUR LEAVES AOP, 699","PBTAOP : PBLUE TROPICAL LVS AOP, 699,749","PLEVPD : PALE VIOLET PLAID, 699"]
  },
  {
    "name": "E801",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JBO","JWC","NYL","PDL","ROV"],
    "colorname": ["JBO : JET BLACK/LOVE, 1299,1399","JWC : JET BLACK W/CALM, 1299,1399","NYL : NAVY/LOVE, 1299,1399","PDL : POWDER BLUE/LOVE, 1299,1399","ROV : ROUGE/LOVE, 1299,1399"]
  },
  {
    "name": "E802",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BGH","JGG","MPGRMG","NVYDGR","PSF"],
    "colorname": ["BGH : BALIGREEN/HAPPY GRA, 949,1049","JGG : JET BLK/GRUMPY, 949,1049","MPGRMG : MAUVE PINK GRIMPY GRAPHIC, 949,1049","NVYDGR : NAVY DREAM GRAPHIC, 949,1049","PSF : PURSLATE/ GRATFUL, 949,1049"]
  },
  {
    "name": "E8S2",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BTH","BWU","MSL"],
    "colorname": ["BTH : BALI GRNSTRIP/HPY GP, 1049,1159","BWU : BLK&WHTSTP/GRUMPYGPH, 1049,1159","MSL : MAUVEPNK STR/SLEEPY, 1049,1159"]
  },
  {
    "name": "E901",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["AFG","AGFG","CWR","JBFG","JWL"],
    "colorname": ["AFG : ASHGREY/FOCUSGRAPHIC, 1199,1299","AGFG : ARMYGREEN/FOCUS GRP, 1199,1299","CWR : CHARCOALMEL W/ RELAX, 999,1099","JBFG : JET BLK/FOCUS, 1199,1299","JWL : JET BLACK W/RELAX, 999"]
  },
  {
    "name": "E903",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["DYB","MLD"],
    "colorname": ["DYB : DRY BLOOD, 1849,1999","MLD : MINERAL RED, 1849,1999"]
  },
  {
    "name": "E904",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BBELL","BLKMEL","MDBMEL","REOC"],
    "colorname": ["BBELL : BLUE BELL, 1699,1849","BLKMEL : BLACK MELANGE, 1699,1849","MDBMEL : MEDIEVAL BLUE MEL, 1699,1849","REOC : Red Ochre, 1699,1849"]
  },
  {
    "name": "E9G2",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["CAPTGR","JBNSGR","ROUTGR","SSNSGR"],
    "colorname": ["CAPTGR : CAPPUCCINO THINK GRAPHIC, 999,1049","JBNSGR : JET BLACK NEVER STOP GRAPHIC, 999,1049","ROUTGR : ROUGE THINK GRAPHIC, 999,1049","SSNSGR : SURF SPRAY NEVER STOP GRAPHIC, 999,1049"]
  },
  {
    "name": "EA61",
    "sizes": ["M","L","XL","XXL"],
    "colors": ["BWI","DBRSG","FGS","GSSR"],
    "colorname": ["BWI : BLACK&WHITE ST/SHINE, 949","DBRSG : DBSTRIPE/RISE-SHINE, 949","FGS : FERN GREEN STR/SHINE, 949","GSSR : G.STNSTR/RISE/SHINE, 949"]
  },
  {
    "name": "EA64",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BLKPAO","LVNDMA","NSO","NVYOA","STRBDD"],
    "colorname": ["BLKPAO : BLACK PIXIE AOP, 1299","LVNDMA : LAVENDER MANDALA AOP, 1299,1399","NSO : NAVY SHIBORI AOP, 1299","NVYOA : NAVY OPTICAK AOP, 1299,1399","STRBDD : STRAWBERRY - DITSY DOT AOP, 1299,1399"]
  },
  {
    "name": "EC13",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BLKBAO","NHO","RBNBA","SFPBPA","SFTGBA"],
    "colorname": ["BLKBAO : BLACK BLING AOP, 1049,1149","NHO : NAVY HOUNDS AOP, 1049","RBNBA : ROBIN BLOCK AOP, 1049,1149","SFPBPA : SOFT PINK BLOCK PRINT AOP, 1049,1149","SFTGBA : SOFT GREEN BLING AOP, 1049,1149"]
  },
  {
    "name": "EC14",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["BDY","JBOP","JCY","NSTDA","NVTAOP","PTSTDA","RIY","SGSTDA"],
    "colorname": ["BDY : BALI GRN TIEDYE  AOP, 1049,1149","JBOP : JET BLACK ALL OVER PRINT, 1049,1149","JCY : JETBLACK TIE DYE AOP, 1049,1149","NSTDA : NAVY SPIRAL TIE DYE AOP, 1049,1149","NVTAOP : NAVY TIE DYE AOP, 1049","PTSTDA : PINK TAFFY SPIRAL TIE DYE AOP, 1049,1149","RIY : ROUGE TIE DYE AOP, 1049,1149","SGSTDA : SOFT GREEN SPIRAL TIE DYE AOP, 1049,1149"]
  },
  {
    "name": "EC16",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JTBMNC","NVYSCM","SFTLMC","SFTPSC"],
    "colorname": ["JTBMNC : JET BLACK MOON COMBO, 1399,1499","NVYSCM : NAVY SUN COMBO, 1399,1499","SFTLMC : SOFT LILAC MOON COMBO, 1399,1499","SFTPSC : SOFT PINK SUN COMBO, 1399,1499"]
  },
  {
    "name": "EC18",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["GSTDA","JCY","NVTAOP","PSD"],
    "colorname": ["GSTDA : GRNSTONE TIE DYE AOP, 1399,1499","JCY : JETBLACK TIE DYE AOP, 1399,1499","NVTAOP : NAVY TIE DYE AOP, 1399,1499","PSD : PURPLE SLATETIE DYE, 1399,1499"]
  },
  {
    "name": "EC19",
    "sizes": ["S","M","L","XL","XXL"],
    "colors": ["JBSA","NVYCIR","PSSAOP","TCCA"],
    "colorname": ["JBSA : JET BLACK SQUARE AOP, 1599,1699","NVYCIR : NAVY CIRCLE AOP, 1599,1699","PSSAOP : PURPLE SLATE SQUARE, 1599,1699","TCCA : TERRA COTTA CIRCLE, 1599,1699"]
  },
  {
    "name": "A014",
    "sizes": ["34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","40Z","42B","42C","42D","42Z"],
    "colors": ["BLACK","MASAI","PEARL","SKIN"],
    "colorname": ["BLACK : BLACK, 979,999,1049","MASAI : MASAI, 979,999,1049","PEARL : PEARL, 979,999,1049","SKIN : SKIN, 979,999,1049"]
  },
  {
    "name": "A017",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK","BPRP","CPM","GKP","ODM","PPRP","SKIN","WHITE"],
    "colorname": ["BLACK : BLACK, 849,899","BPRP : BLUE PRIM ROSE PRINT, 899","CPM : CAPRI MELANGE, 849,899","GKP : GINKO PRINT, 899","ODM : ORCHID MELANGE, 849,899","PPRP : PINK PRIM ROSE PRINT, 899","SKIN : SKIN, 849,899","WHITE : WHITE, 849,899"]
  },
  {
    "name": "A019",
    "sizes": ["32B","32C","34B","34C","36B","36C","38B","38C"],
    "colors": ["BLACK","RSBLSH","SKIN"],
    "colorname": ["BLACK : BLACK, 899","RSBLSH : ROSE BLUSH, 899","SKIN : SKIN, 899"]
  },
  {
    "name": "A022",
    "sizes": ["S","M","L","XL"," 2XL"],
    "colors": ["BLACK","GRYMRL","PEARL","SKIN","WHITE"],
    "colorname": ["BLACK : BLACK, 469,449","GRYMRL : GREY MELANGE, 469,449","PEARL : PEARL, 469,449","SKIN : SKIN, 469,449","WHITE : WHITE, 469,449"]
  },
  {
    "name": "A027",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C","38D"],
    "colors": ["BDE","BLACK","GRW","GRYMEL","PLS","WHITE"],
    "colorname": ["BDE : BLUSHING BRIDE, 779,799","BLACK : BLACK, 779,799","GRW : GRAPE WINE, 779,799","GRYMEL : GREY MELANGE, 779,799","PLS : PALE SKIN, 779,799","WHITE : WHITE, 779,799"]
  },
  {
    "name": "A032",
    "sizes": ["32B","32C","34B","34C","36B","36C","38B","38C"],
    "colors": ["BLACK","CHYBLS","ECL","RTE","SLI","WHITE"],
    "colorname": ["BLACK : BLACK, 999","CHYBLS : CHERRY BLOSSOM, 999","ECL : ECLIPSE, 999","RTE : ROSETTE, 999","SLI : SILVER LILAC, 999","WHITE : WHITE, 999"]
  },
  {
    "name": "A039",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C","38D"],
    "colors": ["BLACK","EVEBLU","GRW","GRYMRL","LILAST","LIMAPR","PEARL","RESWPR","SKIN","WHITE"],
    "colorname": ["BLACK : BLACK, 799,849","EVEBLU : EVENING BLUE, 799,849","GRW : GRAPE WINE, 799,849","GRYMRL : GREY MELANGE, 799,849","LILAST : LILAC ASTER, 849,899","LIMAPR : LILAC MARBLE, 799,849","PEARL : PEARL, 799,849","RESWPR : RED SWRILL PRINT, 849,899","SKIN : SKIN, 799,849","WHITE : WHITE, 799,849"]
  },
  {
    "name": "A042",
    "sizes": ["32B","32C","32D","32Z","34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","42B","42C"],
    "colors": ["BLACK","CHIVIO","CMG","GSP","LPR","ODM","PEARL","PURPLE","RVL","SKIN","TMG","WHITE"],
    "colorname": ["BLACK : BLACK, 699,729,769","CHIVIO : CHINESE VIOLET, 699,729,769","CMG : CHAMBRAY MELANGE, 699,729,769","GSP : GINKOSCATTERED PRINT, 749,779,829","LPR : LUPINE PRINT, 749,779,829","ODM : ORCHID MELANGE, 699,729,769","PEARL : PEARL, 699,729,769","PURPLE : PURPLE, 699,729,769","RVL : REVELLO PRINT, 749,779,829","SKIN : SKIN, 699,729,769","TMG : TOMATO MELANGE, 699,729,769","WHITE : WHITE, 699,729,769"]
  },
  {
    "name": "A055",
    "sizes": ["32B","32C","34B","34C","36B","36C","38B","38C"],
    "colors": ["BLACK","CFAUP","GRW","PEARL","SKIN","TLPP","WHITE"],
    "colorname": ["BLACK : BLACK, 599","CFAUP : CORAL FAUNA PRINT, 649","GRW : GRAPE WINE, 599","PEARL : PEARL, 599","SKIN : SKIN, 599","TLPP : TULIP PRINT, 649","WHITE : WHITE, 599"]
  },
  {
    "name": "A058",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C","38D","40B","40C"],
    "colors": ["BLACK","PHB","PLS","WHITE"],
    "colorname": ["BLACK : BLACK, 879,929","PHB : PEACH BLOSSOM, 879,929","PLS : PALE SKIN, 879,929","WHITE : WHITE, 879,929"]
  },
  {
    "name": "A064",
    "sizes": ["32C","32D","34B","34C","34D","36B","36C","36D","38B","38C","38D"],
    "colors": ["BLACK","GRW","RTE"],
    "colorname": ["BLACK : BLACK, 1299,1349","GRW : GRAPE WINE, 1299,1349","RTE : ROSETTE, 1299,1349"]
  },
  {
    "name": "A072",
    "sizes": ["32B","32C","34B","34C","36B","36C","38B","38C"],
    "colors": ["BLACK","PHB","PLS"],
    "colorname": ["BLACK : BLACK, 549","PHB : PEACH BLOSSOM, 549","PLS : PALE SKIN, 549"]
  },
  {
    "name": "A073",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK","SKIN"],
    "colorname": ["BLACK : BLACK, 629","SKIN : SKIN, 629"]
  },
  {
    "name": "A076",
    "sizes": ["S","M","L","XL"],
    "colors": ["ECL","OLT","RSBLSH"],
    "colorname": ["ECL : ECLIPSE, 949","OLT : PEARL BLUSH, 949","RSBLSH : ROSE BLUSH, 949"]
  },
  {
    "name": "A077",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["ECL","OLT","RSBLSH"],
    "colorname": ["ECL : ECLIPSE, 1049","OLT : PEARL BLUSH, 1049","RSBLSH : ROSE BLUSH, 1049"]
  },
  {
    "name": "A078",
    "sizes": ["32B","32C","32D","32Z","34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D"],
    "colors": ["BLACK","BRI","PLS"],
    "colorname": ["BLACK : BLACK, 999,1019,1049","BRI : BRIDAL RED, 999,1019,1049","PLS : PALE SKIN, 999,1019,1049"]
  },
  {
    "name": "A106",
    "sizes": ["XS","S","M","L","XL"," 2XL"],
    "colors": ["BDE","BLACK","SKIN","WHITE"],
    "colorname": ["BDE : BLUSHING BRIDE, 669,649","BLACK : BLACK, 669,649","SKIN : SKIN, 669,649","WHITE : WHITE, 669,649"]
  },
  {
    "name": "A112",
    "sizes": ["34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","40Z","42B","42C","42D","42Z"," 32B"," 32C"," 32D"," 32Z"],
    "colors": ["BLACK","CMG","GRW","PBH","PLS","RTE","WHITE"],
    "colorname": ["BLACK : BLACK, 999,1029,1049","CMG : CHAMBRAY MELANGE, 999,1029,1049","GRW : GRAPE WINE, 999,1029,1049","PBH : PEACH BLUSH, 999,1029,1049","PLS : PALE SKIN, 999,1029,1049","RTE : ROSETTE, 999,1029,1049","WHITE : WHITE, 999,1029,1049"]
  },
  {
    "name": "A125",
    "sizes": ["S","M","L","XL"],
    "colors": ["CHAMEL","GRYMEL","WHITE"],
    "colorname": ["CHAMEL : CHARCOAL MELANGE, 499","GRYMEL : GREY MELANGE, 499","WHITE : WHITE, 499"]
  },
  {
    "name": "A132",
    "sizes": ["32B","32C","32D","32Z","34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D"],
    "colors": ["BLACK","CBP","PLS"],
    "colorname": ["BLACK : BLACK, 1299,1449","CBP : CHERRY BLOSSOM PRINT, 1299,1449","PLS : PALE SKIN, 1299,1449"]
  },
  {
    "name": "A165",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK","PLS","TSE"],
    "colorname": ["BLACK : BLACK, 1049","PLS : PALE SKIN, 1049","TSE : TIBETAN STONE, 1049"]
  },
  {
    "name": "AB75",
    "sizes": ["34B","34C","34D","36B","36C","36D","38B","38C","38D","40B","40C","40D","42B","42C","42D"],
    "colors": ["BLACK","ODM","PEARL","PLS","PURPLE","WHITE"],
    "colorname": ["BLACK : BLACK, 799,879,899","ODM : ORCHID MELANGE, 799,879","PEARL : PEARL, 799,879,899","PLS : PALE SKIN, 799,879,899","PURPLE : PURPLE, 799,879,899","WHITE : WHITE, 799,879,899"]
  },
  {
    "name": "BB01",
    "sizes": ["XS","S","M","2xs"],
    "colors": ["SKIN","WHITE"],
    "colorname": ["SKIN : SKIN, 339","WHITE : WHITE, 339"]
  },
  {
    "name": "BB02",
    "sizes": ["XS","S","M","2xs"],
    "colors": ["BLACK","PEARL","WHITE"],
    "colorname": ["BLACK : BLACK, 339","PEARL : PEARL, 339","WHITE : WHITE, 339"]
  },
  {
    "name": "E001",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","SKIN","WHITE"],
    "colorname": ["BLACK : BLACK, 299","SKIN : SKIN, 299","WHITE : WHITE, 299"]
  },
  {
    "name": "E003",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","SKIN","WHITE"],
    "colorname": ["BLACK : BLACK, 449","SKIN : SKIN, 449","WHITE : WHITE, 449"]
  },
  {
    "name": "E007",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","SKIN","WHITE"],
    "colorname": ["BLACK : BLACK, 399","SKIN : SKIN, 399","WHITE : WHITE, 399"]
  },
  {
    "name": "E016",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["BTWH","HBSCS","HLMLLC","HTRRSE","JETBLK","LGM","LTBM","SKIN"],
    "colorname": ["BTWH : BRIGHT WHITE, 299,289","HBSCS : HIBISCUS, 299,289","HLMLLC : HEIRLOOM LILAC, 299,289","HTRRSE : HEATHER ROSE, 299,289","JETBLK : JET BLACK, 299,289","LGM : LIGHT GREY MELANGE, 299,289","LTBM : LIGHT BLUE MELANGE, 299,289","SKIN : SKIN, 299,289"]
  },
  {
    "name": "E025",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","NAVY","PHP","WHITE"],
    "colorname": ["BLACK : BLACK, 299","NAVY : NAVY, 299","PHP : PEACH PINK, 299","WHITE : WHITE, 299"]
  },
  {
    "name": "E032",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","SKIN","WHITE"],
    "colorname": ["BLACK : BLACK, 299","SKIN : SKIN, 299","WHITE : WHITE, 299"]
  },
  {
    "name": "E095",
    "sizes": ["S","M","L","XL"],
    "colors": ["SKIN","WHITE"],
    "colorname": ["SKIN : SKIN, 399","WHITE : WHITE, 399"]
  },
  {
    "name": "MT02",
    "sizes": ["34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","40Z"],
    "colors": ["CPM","GRW","ODM","SKIN"],
    "colorname": ["CPM : CAPRI MELANGE, 949,979,1049","GRW : GRAPE WINE, 949,979,1049","ODM : ORCHID MELANGE, 949,979,1049","SKIN : SKIN, 949,979,1049"]
  },
  {
    "name": "SB06",
    "sizes": ["XS","S","M","L","XL","2XL"," 2XL"],
    "colors": ["BLACK","CPM","DHP","GRW","GRYMRL","MFL","PEARL","SKIN","TMG","WHITE"],
    "colorname": ["BLACK : BLACK, 419,399","CPM : CAPRI MELANGE, 419,399","DHP : DITSY HEART PRINT, 499,479","GRW : GRAPE WINE, 419,399","GRYMRL : GREY MELANGE, 419,399","MFL : MARBLE FLAKE PRINT, 479,499","PEARL : PEARL, 419,399","SKIN : SKIN, 419,399","TMG : TOMATO MELANGE, 419,399","WHITE : WHITE, 419,399"]
  },
  {
    "name": "SB08",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","GRW","GRYMEL","MLP","MMV","PEARL"],
    "colorname": ["BLACK : BLACK, 899,929","GRW : GRAPE WINE, 899,929","GRYMEL : GREY MELANGE, 899,929","MLP : MARBLE LOCK PRINT, 899,929","MMV : MARBLE MAVVE PRINT, 899,929","PEARL : PEARL, 899,929"]
  },
  {
    "name": "SB28",
    "sizes": ["LAR","MED","SMA","XLA"],
    "colors": ["BLACK","GRYMEL","PFI"],
    "colorname": ["BLACK : BLACK, 649,669","GRYMEL : GREY MELANGE, 649,669","PFI : PARFAIT PINK, 649,669"]
  },
  {
    "name": "SB38",
    "sizes": ["S","M","L","XL"],
    "colors": ["FUCPUR","GRA","WHITE"],
    "colorname": ["FUCPUR : FUCHIA PURPLE, 749","GRA : GRAPHITE, 749","WHITE : WHITE, 749"]
  },
  {
    "name": "TH01",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["BLACK","PEI","PLS"],
    "colorname": ["BLACK : BLACK, 949,899","PEI : PEAR PINK, 949,899","PLS : PALE SKIN, 949,899"]
  },
  {
    "name": "TH02",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["BLACK","PEI","PLS"],
    "colorname": ["BLACK : BLACK, 1099,1049","PEI : PEAR PINK, 1099,1049","PLS : PALE SKIN, 1099,1049"]
  },
  {
    "name": "TH03",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["BLACK","PEI","PLS"],
    "colorname": ["BLACK : BLACK, 1249,1199","PEI : PEAR PINK, 1249,1199","PLS : PALE SKIN, 1249,1199"]
  },
  {
    "name": "BR08",
    "sizes": ["M","L","XL","2XL"],
    "colors": ["BLACK","BUFF"],
    "colorname": ["BLACK : BLACK, 1299","BUFF : BUFF, 1299"]
  },
  {
    "name": "BR11",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["BLACK","HOB"],
    "colorname": ["BLACK : BLACK, 1999","HOB : HONEY BEIGE, 1999"]
  },
  {
    "name": "F023",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK","FRHPRT","IGY","NSTLGR","PWL","SIL","SOR"],
    "colorname": ["BLACK : BLACK, 1049","FRHPRT : FRINGED HIBISCUS PRINT, 1199","IGY : INK GREY, 1049","NSTLGR : NOSTALGIA ROSE, 1049","PWL : PINK WILD LACE PRINT, 1199","SIL : SILVER ROSE PRINT, 1199","SOR : SORRENTO PRINT, 1199"]
  },
  {
    "name": "F024",
    "sizes": ["32B","32C","32D","32Z","34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","40B","40C","40D","42C","42D"],
    "colors": ["BLACK","CON","PLS","WHITE"],
    "colorname": ["BLACK : BLACK, 1049,1159","CON : CONFETTI, 1049,1159","PLS : PALE SKIN, 1049,1159","WHITE : WHITE, 1049,1159"]
  },
  {
    "name": "F037",
    "sizes": ["S","M","L","XL"],
    "colors": ["ALS","BLACK","LSBNBL","OCH","PSTLIL"],
    "colorname": ["ALS : ALMOND SKIN, 1299","BLACK : BLACK, 1299","LSBNBL : LISBON BLUE, 1299","OCH : ORCHID SMOKE, 1299","PSTLIL : PASTEL LILAC, 1299"]
  },
  {
    "name": "F040",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK","CRMRD"],
    "colorname": ["BLACK : BLACK, 1849","CRMRD : CRIMSON RED, 1849"]
  },
  {
    "name": "F043",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BUTSCO","CTM"],
    "colorname": ["BUTSCO : BUTTER SCOTCH, 1699","CTM : CLARET MAROON, 1699"]
  },
  {
    "name": "F048",
    "sizes": ["34B","34C","34D","34F","34Z","36B","36C","36D","36F","36Z","38B","38C","38D","38F","38Z","40B","40C","40D","40F","40Z"],
    "colors": ["PLUM","TSK"],
    "colorname": ["PLUM : PLUM, 1249,1379","TSK : TAN SKIN, 1249,1379"]
  },
  {
    "name": "F053",
    "sizes": ["34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","40Z"],
    "colors": ["ECL","HOB"],
    "colorname": ["ECL : ECLIPSE, 1699,1869","HOB : HONEY BEIGE, 1699,1869"]
  },
  {
    "name": "F057",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK","HOB","IGY"],
    "colorname": ["BLACK : BLACK, 1399","HOB : HONEY BEIGE, 1399","IGY : INK GREY, 1399"]
  },
  {
    "name": "F065",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["ARO","AUM","BLACK","CLM","HOB","WFM"],
    "colorname": ["ARO : AMARANTO PRINT, 1349","AUM : AUTUMN MELODY PRINT, 1349","BLACK : BLACK, 1249","CLM : PINK CHAMPAGNE, 1249","HOB : HONEY BEIGE, 1179","WFM : WILDFLOWER MELODY, 1349"]
  },
  {
    "name": "F070",
    "sizes": ["LAR","MED","SMA","XLA"],
    "colors": ["IGY","PLS"],
    "colorname": ["IGY : INK GREY, 1349","PLS : PALE SKIN, 1349"]
  },
  {
    "name": "F074",
    "sizes": ["32B","32C","32D","32Z","34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","40Z","42B","42C","42D"],
    "colors": ["BKCCL","BLACK","BOS","BUFF","RSTLCE"],
    "colorname": ["BKCCL : BLACKBERRY CORDIAL LACE, 1549,1709","BLACK : BLACK, 1499,1649","BOS : BOSSA NOVA, 1499,1649","BUFF : BUFF, 1499,1649","RSTLCE : ROSETTE LACE, 1549,1709"]
  },
  {
    "name": "F084",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","NUDE","STI"],
    "colorname": ["BLACK : BLACK, 1499","NUDE : NUDE, 1499","STI : STRAWBERRY ICE, 1499"]
  },
  {
    "name": "F087",
    "sizes": ["34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","40Z"],
    "colors": ["CON","SLI"],
    "colorname": ["CON : CONFETTI, 1499,1649","SLI : SILVER LILAC, 1499,1649"]
  },
  {
    "name": "F091",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["FRVRR","LBLU","PLUM"],
    "colorname": ["FRVRR : FOREVER ROSE, 1849","LBLU : LAPIS BLUE, 1849","PLUM : PLUM, 1849"]
  },
  {
    "name": "F096",
    "sizes": ["34C","34D","34F","34Z","36B","36C","36D","36F","36G","36Z","38C","38D","38F","38G","38Z","40C","40D","40F","40G","40Z","42C","42D","42F","42G","42Z","44C","44D","44F","44G","44Z"],
    "colors": ["BLACK","IGY","PEARL"],
    "colorname": ["BLACK : BLACK, 1499,1549","IGY : INK GREY, 1499,1549","PEARL : PEARL, 1499,1549"]
  },
  {
    "name": "F097",
    "sizes": ["34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","40Z","42B","42C","42D"],
    "colors": ["BLACK","MNPP","PEARL"],
    "colorname": ["BLACK : BLACK, 1399,1449","MNPP : MIDNIGHT PEONY PRINT, 1549,1599","PEARL : PEARL, 1399,1449"]
  },
  {
    "name": "F107",
    "sizes": ["LAR","MED","SMA","XLA"],
    "colors": ["BLACK"],
    "colorname": ["BLACK : BLACK, 999"]
  },
  {
    "name": "F108",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["AQGRY","BLACK","VLTTLP"],
    "colorname": ["AQGRY : AQUA GREY, 1049","BLACK : BLACK, 1049","VLTTLP : VIOLET TULIP, 1049"]
  },
  {
    "name": "F109",
    "sizes": ["LAR","MED","SMA","XLA"],
    "colors": ["AQGRY","RTE"],
    "colorname": ["AQGRY : AQUA GREY, 899","RTE : ROSETTE, 899"]
  },
  {
    "name": "F110",
    "sizes": ["LAR","MED","SMA","XLA"],
    "colors": ["BLACK"],
    "colorname": ["BLACK : BLACK, 899"]
  },
  {
    "name": "F111",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK","FRVRR","MOLIG"],
    "colorname": ["BLACK : BLACK, 1049","FRVRR : FOREVER ROSE, 1049","MOLIG : MOON LIGHT, 1049"]
  },
  {
    "name": "F114",
    "sizes": ["32B","32C","34B","34C","36B","36C","38B","38C"],
    "colors": ["BLACK","HOB","NSTLGR"],
    "colorname": ["BLACK : BLACK, 1499","HOB : HONEY BEIGE, 1499","NSTLGR : NOSTALGIA ROSE, 1499"]
  },
  {
    "name": "F115",
    "sizes": ["32B","32C","34B","34C","36B","36C","38B","38C"],
    "colors": ["BLACK","HOB"],
    "colorname": ["BLACK : BLACK, 1599","HOB : HONEY BEIGE, 1599"]
  },
  {
    "name": "F116",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","38B","38C"],
    "colors": ["BKC","DSR"],
    "colorname": ["BKC : BLACKBERRY CORDIAL, 1499","DSR : DUSTY ROSE, 1499"]
  },
  {
    "name": "F118",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["DSR","VLTTLP"],
    "colorname": ["DSR : DUSTY ROSE, 1599","VLTTLP : VIOLET TULIP, 1599"]
  },
  {
    "name": "F121",
    "sizes": ["32D","32Z","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","40Z"],
    "colors": ["BLACK","HOB","SLI"],
    "colorname": ["BLACK : BLACK, 1049,1199","HOB : HONEY BEIGE, 1049,1199","SLI : SILVER LILAC, 1049,1199"]
  },
  {
    "name": "F122",
    "sizes": ["34C","34D","34F","34Z","36B","36C","36D","36F","36Z","38B","38C","38D","38F","38Z","40B","40C","40D","40F","40Z"],
    "colors": ["BKC","RTE"],
    "colorname": ["BKC : BLACKBERRY CORDIAL, 1399,1549","RTE : ROSETTE, 1399,1549"]
  },
  {
    "name": "F123",
    "sizes": ["32B","32C","32D","32Z","34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","40B","40C"],
    "colors": ["BLACK","HOB","NSTLGR"],
    "colorname": ["BLACK : BLACK, 1599,1749","HOB : HONEY BEIGE, 1599,1749","NSTLGR : NOSTALGIA ROSE, 1599,1749"]
  },
  {
    "name": "F124",
    "sizes": ["32D","32F","32G","32Z","34C","34D","34F","34G","34Z","36C","36D","36F","36G","36Z","38C","38D","38F","38G","38Z","40C","40D","40F","40Z"],
    "colors": ["BLACK","CEDWOD"],
    "colorname": ["BLACK : BLACK, 1599,1699","CEDWOD : CEDAR WOOD, 1599,1699"]
  },
  {
    "name": "F125",
    "sizes": ["S","M","L","XL"],
    "colors": ["CEDWOD","NUGGET"],
    "colorname": ["CEDWOD : CEDAR WOOD, 1399","NUGGET : NUGGET, 1399"]
  },
  {
    "name": "F126",
    "sizes": ["32D","32F","32G","32Z","34C","34D","34F","34G","34Z","36C","36D","36F","36G","36Z","38C","38D","38F","38G","38Z","40C","40D","40F","40Z"],
    "colors": ["BLACK","CEDWOD"],
    "colorname": ["BLACK : BLACK, 1349,1449","CEDWOD : CEDAR WOOD, 1349,1449"]
  },
  {
    "name": "F127",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["OLT","SLI"],
    "colorname": ["OLT : PEARL BLUSH, 1599","SLI : SILVER LILAC, 1599"]
  },
  {
    "name": "F129",
    "sizes": ["32B","32C","32D","32Z","34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D"],
    "colors": ["COSKY","VIOQUA"],
    "colorname": ["COSKY : COSMIC SKY, 1399,1539","VIOQUA : VIOLET QUARTZ, 1399,1539"]
  },
  {
    "name": "F130",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","38B"],
    "colors": ["CHBLPR","WISPRT"],
    "colorname": ["CHBLPR : CHERRY BLOSSOM PRINT, 1699","WISPRT : WISTERIA PRINT, 1699"]
  },
  {
    "name": "F131",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C","38D"],
    "colors": ["BLACK","HOB","NSTLGR"],
    "colorname": ["BLACK : BLACK, 949","HOB : HONEY BEIGE, 949","NSTLGR : NOSTALGIA ROSE, 949"]
  },
  {
    "name": "F132",
    "sizes": ["32B","32C","32D","32Z","34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D"],
    "colors": ["BLACK","HOB"],
    "colorname": ["BLACK : BLACK, 1049,1159","HOB : HONEY BEIGE, 1049,1159"]
  },
  {
    "name": "F133",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK"],
    "colorname": ["BLACK : BLACK, 1299"]
  },
  {
    "name": "F134",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["HIBRED","OLT"],
    "colorname": ["HIBRED : Hibiscus Red, 1399","OLT : PEARL BLUSH, 1399"]
  },
  {
    "name": "F135",
    "sizes": ["34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z"],
    "colors": ["BLACK","BOS","BUFF"],
    "colorname": ["BLACK : BLACK, 1599,1759","BOS : BOSSA NOVA, 1599,1759","BUFF : BUFF, 1599,1759"]
  },
  {
    "name": "F137",
    "sizes": ["S","M","L","XL"],
    "colors": ["LSBNBL","PSTLIL"],
    "colorname": ["LSBNBL : LISBON BLUE, 1499","PSTLIL : PASTEL LILAC, 1499"]
  },
  {
    "name": "F138",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK","HIBRED","OLT"],
    "colorname": ["BLACK : BLACK, 1699","HIBRED : Hibiscus Red, 1699","OLT : PEARL BLUSH, 1699"]
  },
  {
    "name": "F141",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK","HAURED"],
    "colorname": ["BLACK : BLACK, 1899","HAURED : HAUTE RED, 1899"]
  },
  {
    "name": "F142",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","HAURED"],
    "colorname": ["BLACK : BLACK, 1899","HAURED : HAUTE RED, 1899"]
  },
  {
    "name": "F143",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["MONGRY","NUDROS"],
    "colorname": ["MONGRY : MOON GREY, 1799","NUDROS : NUDE ROSE, 1799"]
  },
  {
    "name": "F144",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["MONGRY","NUDROS"],
    "colorname": ["MONGRY : MOON GREY, 1599","NUDROS : NUDE ROSE, 1599"]
  },
  {
    "name": "F165",
    "sizes": ["32B","32C","32D","34B","34C","34D","36B","36C","36D","38B","38C"],
    "colors": ["BLACK","DNT","FVP","HOB","PCHCRL"],
    "colorname": ["BLACK : BLACK, 1299","DNT : DAINTY PETAL PRINT, 1399","FVP : FESTIVE PETAL PRINT, 1399","HOB : HONEY BEIGE, 1299","PCHCRL : PEACH CORAL, 1299"]
  },
  {
    "name": "FB06",
    "sizes": ["34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","40Z","42B","42C","42D","42Z"],
    "colors": ["BKC","BLACK","MASAI","PLS","WHITE"],
    "colorname": ["BKC : BLACKBERRY CORDIAL, 1149,1269","BLACK : BLACK, 1149,1269","MASAI : MASAI, 1149,1269","PLS : PALE SKIN, 1149,1269","WHITE : WHITE, 1149,1269"]
  },
  {
    "name": "FB12",
    "sizes": ["34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D","38Z","40B","40C","40D","40Z","42B","42C","42D","42Z"],
    "colors": ["BLACK","BUFF","CLM","ECL","GRW","MASAI","WHITE"],
    "colorname": ["BLACK : BLACK, 1199,1319","BUFF : BUFF, 1199,1319","CLM : PINK CHAMPAGNE, 1199,1319","ECL : ECLIPSE, 1199,1319","GRW : GRAPE WINE, 1199,1319","MASAI : MASAI, 1199,1319","WHITE : WHITE, 1199,1319"]
  },
  {
    "name": "N116",
    "sizes": ["S","M","L","XL"],
    "colors": ["BKC"],
    "colorname": ["BKC : BLACKBERRY CORDIAL, 1499"]
  },
  {
    "name": "N118",
    "sizes": ["S","M","L","XL"],
    "colors": ["DSR","VLTTLP"],
    "colorname": ["DSR : DUSTY ROSE, 2099","VLTTLP : VIOLET TULIP, 2099"]
  },
  {
    "name": "N125",
    "sizes": ["S","M","L","XL"],
    "colors": ["CEDWOD","NUGGET"],
    "colorname": ["CEDWOD : CEDAR WOOD, 1699","NUGGET : NUGGET, 1699"]
  },
  {
    "name": "N127",
    "sizes": ["S","M","L","XL"],
    "colors": ["OLT","SLI"],
    "colorname": ["OLT : PEARL BLUSH, 2199","SLI : SILVER LILAC, 2199"]
  },
  {
    "name": "N138",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","HIBRED"],
    "colorname": ["BLACK : BLACK, 1999","HIBRED : Hibiscus Red, 1999"]
  },
  {
    "name": "N143",
    "sizes": ["S","M","L","XL"],
    "colors": ["MONGRY","NUDROS"],
    "colorname": ["MONGRY : MOON GREY, 1899","NUDROS : NUDE ROSE, 1899"]
  },
  {
    "name": "P000",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["ARO","AUM","BLACK","FRHPRT","GRNTR","MNBLU","PWL","SIL","SOR","WFM"],
    "colorname": ["ARO : AMARANTO PRINT, 469","AUM : AUTUMN MELODY PRINT, 469","BLACK : BLACK, 409","FRHPRT : FRINGED HIBISCUS PRINT, 469","GRNTR : GARNET ROSE, 409","MNBLU : MOONLIT BLUE, 409","PWL : PINK WILD LACE PRINT, 469","SIL : SILVER ROSE PRINT, 469","SOR : SORRENTO PRINT, 469","WFM : WILDFLOWER MELODY, 469"]
  },
  {
    "name": "P037",
    "sizes": ["S","M","L","XL"],
    "colors": ["ALS","LSBNBL","PSTLIL"],
    "colorname": ["ALS : ALMOND SKIN, 849","LSBNBL : LISBON BLUE, 849","PSTLIL : PASTEL LILAC, 849"]
  },
  {
    "name": "P040",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","CRMRD"],
    "colorname": ["BLACK : BLACK, 649","CRMRD : CRIMSON RED, 649"]
  },
  {
    "name": "P043",
    "sizes": ["S","M","L","XL"],
    "colors": ["BUTSCO","CTM"],
    "colorname": ["BUTSCO : BUTTER SCOTCH, 499","CTM : CLARET MAROON, 499"]
  },
  {
    "name": "P087",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["CON","SLI"],
    "colorname": ["CON : CONFETTI, 749","SLI : SILVER LILAC, 749"]
  },
  {
    "name": "P091",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["FRVRR","LBLU","PLUM"],
    "colorname": ["FRVRR : FOREVER ROSE, 729","LBLU : LAPIS BLUE, 729","PLUM : PLUM, 729"]
  },
  {
    "name": "P108",
    "sizes": ["S","M","L","XL"],
    "colors": ["AQGRY","BLACK","RTE"],
    "colorname": ["AQGRY : AQUA GREY, 549","BLACK : BLACK, 549","RTE : ROSETTE, 549"]
  },
  {
    "name": "P109",
    "sizes": ["S","M","L"],
    "colors": ["AQGRY","BLACK","RTE"],
    "colorname": ["AQGRY : AQUA GREY, 449","BLACK : BLACK, 449","RTE : ROSETTE, 449"]
  },
  {
    "name": "P112",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["PURPLE","SCRED"],
    "colorname": ["PURPLE : PURPLE, 599","SCRED : SCOOTER RED, 599"]
  },
  {
    "name": "P113",
    "sizes": ["S","M","L","XL"],
    "colors": ["PURPLE","SCRED"],
    "colorname": ["PURPLE : PURPLE, 499","SCRED : SCOOTER RED, 499"]
  },
  {
    "name": "P116",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["BKC","DSR"],
    "colorname": ["BKC : BLACKBERRY CORDIAL, 599","DSR : DUSTY ROSE, 599"]
  },
  {
    "name": "P118",
    "sizes": ["S","M","L","XL"],
    "colors": ["DSR","VLTTLP"],
    "colorname": ["DSR : DUSTY ROSE, 499","VLTTLP : VIOLET TULIP, 499"]
  },
  {
    "name": "P122",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["BKC","RTE"],
    "colorname": ["BKC : BLACKBERRY CORDIAL, 499","RTE : ROSETTE, 499"]
  },
  {
    "name": "P125",
    "sizes": ["S","M","L","XL"],
    "colors": ["CEDWOD","NUGGET"],
    "colorname": ["CEDWOD : CEDAR WOOD, 599","NUGGET : NUGGET, 599"]
  },
  {
    "name": "P126",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["BLACK","CEDWOD"],
    "colorname": ["BLACK : BLACK, 599","CEDWOD : CEDAR WOOD, 599"]
  },
  {
    "name": "P127",
    "sizes": ["S","M","L","XL"],
    "colors": ["OLT","SLI"],
    "colorname": ["OLT : PEARL BLUSH, 549","SLI : SILVER LILAC, 549"]
  },
  {
    "name": "P129",
    "sizes": ["S","M","L","XL"],
    "colors": ["COSKY","VIOQUA"],
    "colorname": ["COSKY : COSMIC SKY, 599","VIOQUA : VIOLET QUARTZ, 599"]
  },
  {
    "name": "P130",
    "sizes": ["S","M","L","XL"],
    "colors": ["CHBLPR","WISPRT"],
    "colorname": ["CHBLPR : CHERRY BLOSSOM PRINT, 659","WISPRT : WISTERIA PRINT, 659"]
  },
  {
    "name": "P138",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","HIBRED","OLT"],
    "colorname": ["BLACK : BLACK, 549","HIBRED : Hibiscus Red, 549","OLT : PEARL BLUSH, 549"]
  },
  {
    "name": "P141",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","HAURED"],
    "colorname": ["BLACK : BLACK, 549","HAURED : HAUTE RED, 549"]
  },
  {
    "name": "P142",
    "sizes": ["S","M","L","XL"],
    "colors": ["BLACK","HAURED"],
    "colorname": ["BLACK : BLACK, 599","HAURED : HAUTE RED, 599"]
  },
  {
    "name": "P143",
    "sizes": ["S","M","L","XL"],
    "colors": ["MONGRY","NUDROS"],
    "colorname": ["MONGRY : MOON GREY, 599","NUDROS : NUDE ROSE, 599"]
  },
  {
    "name": "P165",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["DNT","FVP"],
    "colorname": ["DNT : DAINTY PETAL PRINT, 569","FVP : FESTIVE PETAL PRINT, 569"]
  },
  {
    "name": "PB40",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["QUP","JETBLK","NUDE"],
    "colorname": ["JETBLK : JET BLACK, 459,449","NUDE : NUDE, 459,449","QUP : QUEEN PINK, 499,449"]
  },
  {
    "name": "PS40",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["GRKBLU","JETBLK","NUDE","QUP"],
    "colorname": ["GRKBLU : GREEK BLUE, 459,449","JETBLK : JETBLACK, 509","JETBLK : JET BLACK, 499","NUDE : NUDE, 509,499","QUP : QUEEN PINK, 509,499"]
  },
  {
    "name": "SB18",
    "sizes": ["32B","32C","32D","32Z","34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D"],
    "colors": ["BLACK","GRYMEL","LCR","NISH"],
    "colorname": ["BLACK : BLACK, 1949","GRYMEL : GREY MELANGE, 1949","LCR : LILAC RUN, 1999","NISH : NIGHT SHADE, 1949"]
  },
  {
    "name": "SB25",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["GRYMEL","PEARL"],
    "colorname": ["GRYMEL : GREY MELANGE, 1249","PEARL : PEARL, 1249"]
  },
  {
    "name": "SB29",
    "sizes": ["30D","32B","32C","32D","32Z","34B","34C","34D","34Z","36B","36C","36D","36Z","38B","38C","38D"],
    "colors": ["BLACK","NSH"],
    "colorname": ["BLACK : BLACK, 1949","NSH : NIGHTSHADE, 1949"]
  },
  {
    "name": "TS09",
    "sizes": ["M","L","XL","2XL"],
    "colors": ["BLACK","BUFF"],
    "colorname": ["BLACK : BLACK, 1399","BUFF : BUFF, 1399"]
  },
  {
    "name": "CB03",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCP","MCS"],
    "colorname": ["MCP : MULTICOLORPRINT, 579,549","MCS : MULTICOLORSOLID, 529,499"]
  },
  {
    "name": "CH03",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCP","MCS"],
    "colorname": ["MCP : MULTICOLORPRINT, 579,549","MCS : MULTICOLORSOLID, 529,499"]
  },
  {
    "name": "CH06",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCP","MCS"],
    "colorname": ["MCP : MULTICOLORPRINT, 529,509","MCS : MULTICOLORSOLID, 499,479"]
  },
  {
    "name": "CR01",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCD","MCR"],
    "colorname": ["MCD : MULTICOLORDARK, 679,649","MCR : MULTICOLORS, 729,699"]
  },
  {
    "name": "CR02",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCD","MCR"],
    "colorname": ["MCD : MULTICOLORDARK, 679,649","MCR : MULTICOLORS, 729,699"]
  },
  {
    "name": "CR17",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCD","MCM","MCP"],
    "colorname": ["MCD : MULTICOLORDARK, 609,579","MCM : MULTICOLORMEDIUM, 609,579","MCP : MULTICOLORPRINT, 659,629"]
  },
  {
    "name": "MB01",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCS"],
    "colorname": ["MCS : MULTICOLORSOLID, 549,529"]
  },
  {
    "name": "MB20",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCS"],
    "colorname": ["MCS : MULTICOLORSOLID, 619,599"]
  },
  {
    "name": "MH01",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCS"],
    "colorname": ["MCS : MULTICOLORSOLID, 549,529"]
  },
  {
    "name": "MH20",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCS"],
    "colorname": ["MCS : MULTICOLORSOLID, 619,599"]
  },
  {
    "name": "MS01",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["MCS"],
    "colorname": ["MCS : MULTICOLORSOLID, 299,289"]
  },
  {
    "name": "PH40",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["JETBLK","NUDE","QUP"],
    "colorname": ["JETBLK : JET BLACK, 459,449","NUDE : NUDE, 459,449","QUP : QUEEN PINK, 459,449"]
  },
  {
    "name": "PP12",
    "sizes": ["S","M","L","XL","2XL"],
    "colors": ["BLACK","GRW"],
    "colorname": ["BLACK : BLACK, 469,449","GRW : GRAPE WINE, 469,449"]
  }
]

  
  

 ;

// Predefined parties
let parties = [
   "Avni Traders Phonda",
"Bharne Retail Trends Panjim",
  "BURYE EMPORIUM SIOLIM",
"Feelings Phonda",
"Falari Enterpries Mapusa ",
"Puja Cosmetics Vasco",
"Vishnu Fancy Stores Margao",
"Poshak Retail Parvorim",
"Caro Center Margao",
"Lovely Collection Panjim",
"Shetye Enterprises Panjim",
"cash",
"Deepak Store Mapusa",
"M S Dangui Panjim",
"Advait Enterprises Bicholim ",
"Par Excellence Panjim",
"Callicas Cancona",
"J.V Manerkar Panjim",
"Visnu Fancy Stores Margao",
"Santosh Shopping Sanvordem",
"Baron Panjim",
"Goswami Gift Mapusa",
"Krishna Fancy Margao ",
"Femiline Collection Margaon ",
"G D Kalekar Mapusa",
"MS Dangui Mapusa",
"Roop Darpan Bicholim",
"Mahamay Cosmetics Bicholim ",
"Chirag Bag House Panjim",
"Jagannath Kavlekar LLP Mapusa",
"Siddhivinayak Mapusa",
"Manish Cosmetics Miramar"

];

document
  .getElementById("saveOrderBtn")
  .addEventListener("click", showOrderSummaryModal);

const partySearch = document.getElementById("partySearch");
const partyList = document.getElementById("partyList");

partySearch.addEventListener("focus", () => showParties());
partySearch.addEventListener("input", () => showParties(partySearch.value));

document.addEventListener("click", function (e) {
  if (e.target !== partySearch && !partyList.contains(e.target)) {
    partyList.style.display = "none";
  }
});


createCartSummaryTable();

document.getElementById("addToCartBtn").addEventListener("click", addToCart);
document
  .getElementById("saveOrderBtn")
  .addEventListener("click", showOrderSummaryModal);


//----------------------------------------party--------------------------------
function sortParties() {
    parties.sort((a, b) => {
      if (typeof a === "string" && typeof b === "string") {
        return a.localeCompare(b, undefined, { sensitivity: "base" });
      }
      // Handle non-string elements (you can modify this part based on your needs)
      return 0;
    });
  }
  function showParties(filter = "") {
    partyList.innerHTML = "";
    const filteredParties = parties.filter((party) => {
      if (typeof party === "string") {
        return party.toLowerCase().includes(filter.toLowerCase());
      }
      return false; // or handle non-string elements as needed
    });
  
    filteredParties.forEach((party) => {
      const item = document.createElement("a");
      item.classList.add("list-group-item", "list-group-item-action");
      item.textContent = party;
      item.href = "#";
      item.addEventListener("click", function (e) {
        e.preventDefault();
        partySearch.value = party;
        partyList.style.display = "none";
      });
      partyList.appendChild(item);
    });
  
    if (filteredParties.length === 0 && filter !== "") {
      const addNewItem = document.createElement("a");
      addNewItem.classList.add("list-group-item", "list-group-item-action");
      addNewItem.textContent = `Add "${filter}" as a new party`;
      addNewItem.href = "#";
      addNewItem.addEventListener("click", function (e) {
        e.preventDefault();
        addNewParty(filter);
      });
      partyList.appendChild(addNewItem);
    }
  
    partyList.style.display = "block";
  }
  
  function addNewParty(partyInput) {
    const [partyName, area] = partyInput.split(" - ").map((s) => s.trim());
    if (!partyName || !area) {
      alert(
        'Please enter the party name and area in the format "PARTYNAME - AREA"'
      );
      return;
    }
  
    const fullPartyName = `${partyName} - ${area}`;
    if (!parties.includes(fullPartyName)) {
      parties.push(fullPartyName);
      sortParties();
      // Save only the new party to Firebase
      firebase
        .database()
        .ref("parties/" + fullPartyName.replace(".", "_"))
        .set(true);
      console.log(`Added new party: ${fullPartyName}`);
  
      // Log the activity
      const now = new Date();
      const activityLog = {
        action: "Created new party",
        partyName: fullPartyName,
        timestamp: now.toISOString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        username: username,
      };
      firebase.database().ref("activityLogs").push(activityLog);
  
      // Send Telegram message
      const chatId = "-4527298165";
      const botToken = "7401966895:AAFu7gNrOPhMXJQNJTRk4CkK4TjRr09pxUs";
      const message = `${username}: created new party ${fullPartyName}`;
      const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(
        message
      )}`;
  
      fetch(url)
        .then((response) => response.json())
        .then((data) => console.log("Telegram message sent:", data))
        .catch((error) =>
          console.error("Error sending Telegram message:", error)
        );
    }
    partySearch.value = fullPartyName;
    partyList.style.display = "none";
  }
 

// ---------------------Color Management
function handleColorContainerClick(event) {
  // Check if the click was on the input or label
  if (
    event.target.classList.contains("quantity-input") ||
    event.target.classList.contains("size-label")
  ) {
    return; // Do nothing if the click was on an input or label
  }

  // Toggle the grid if the click was on the container itself
  const colorContainer = event.currentTarget;
  const sizeQuantityGrid = colorContainer.querySelector(".size-quantity-grid");

  if (
    sizeQuantityGrid.style.display === "none" ||
    sizeQuantityGrid.style.display === ""
  ) {
    sizeQuantityGrid.style.display = "block";
  } else {
    sizeQuantityGrid.style.display = "none";
  }
}

function getBackgroundColor(color) {
  const colorMap = {
      'BLACK': 'black',
      'WHITE': '#FFFFFF',
      'GRW': '#341917',
      'GRYMRL': '#d8d7dc',
      'LILAST': `url("https://www.enamor.co.in/cdn/shop/files/5_ea03e152-8bbc-4cb3-b605-7ec29a515d86.jpg?v=1684217469") 75% 50% / cover no-repeat`,
      'LIMAPR': 'url("https://www.enamor.co.in/cdn/shop/files/1AvTEPQ_KfpsXo7Tzhyb6Q45y0usBJr7S.jpg?v=1696598482") 75% 50% /  cover no-repeat',
      'RESWPR': 'url(" https://www.enamor.co.in/cdn/shop/files/1nncqC7eWXEd5EVIPwJJUGsS4YfX-Igyz.jpg?v=1696598470") 75% 50% /  cover no-repeat',
      'EVB': 'navy',
      'PEARL': '#E6C7B8',
      'SKIN': '#E4C7A7',
      'DIO': 'white',
      'JBK': '#0A0A0A',
      'PCMARG': 'cyan',
      'PSMARG': 'lightpink',
      'EVEBLU': '#222133',
      'MASAI' : 'url(" https://www.enamor.co.in/cdn/shop/products/a014_masai_13__1_large.jpg?v=1676456937") 30% 50% /  1500% no-repeat',
      'BPRP' : 'url(" https://www.enamor.co.in/cdn/shop/files/5_4fba307d-bfc2-471e-b91f-c1b5bf2d0dba_large.jpg?v=1683789659") 75% 50% /  cover no-repeat',
      'PPRP': 'url("https://www.enamor.co.in/cdn/shop/files/5_5b158d6a-bc65-49bd-8f0f-4382ba1b513f_large.jpg?v=1683789670")75% 50% /  cover no-repeat',   
      'CPM': '#D2E3EB',   
      'GKP': 'url("https://www.enamor.co.in/cdn/shop/products/6_836_large.jpg?v=1700655975")75% 50% /  cover no-repeat',  
      'ODM': '#EEC9D3',  
      'RSBLSH': '#D5868E',  
      'PLS': '#D4C2B6',  
      'GRYMEL': '#d8d7dc',  
      'BDE': 'url("https://www.enamor.co.in/cdn/shop/products/00a027bde_1_4_large.jpg?v=1676458803")65% 100% /  1600% no-repeat',  
      'RTE': '#CC746D',  
      'ECL': '#2F2F4A',  
      'SLI': 'url("https://www.enamor.co.in/cdn/shop/products/6_841_12_large.jpg?v=1676464479")0% 0% /  1000% no-repeat',  
      'CHYBLS': 'url("https://www.enamor.co.in/cdn/shop/products/4_1000_1_large.jpg?v=1716458121")67% 90% /  1400% no-repeat',  
      'CHIVIO': 'url("https://www.enamor.co.in/cdn/shop/files/6_ad2713ea-70f4-497a-9c1b-a33d892d2cd2_large.jpg?v=1708944721")75% 80% /  1000% no-repeat',
      'CMG': '#B5C4D8',
      'GSP': 'url("https://www.enamor.co.in/cdn/shop/products/6_876.jpg?v=1676466389")0% 20% /  1000% no-repeat',
      'DDO': 'url("https://www.enamor.co.in/cdn/shop/products/6_875.jpg?v=1676466411")0% 20% /  1000% no-repeat',
      'LPR': 'url("https://www.enamor.co.in/cdn/shop/files/18b1XCLuTl3M_ytx9Tb1tLfUEK1RDyrBp_large.jpg?v=1696598795")50% 50% /  500% no-repeat',
      'PURPLE': '#6C2B6A',
      'TMG':'#E67F81',
      'RVL': 'url("https://www.enamor.co.in/cdn/shop/products/6_920_4.jpg?v=1677836790")0% 20% /  1000% no-repeat',
      'CFAUP': 'url("https://www.enamor.co.in/cdn/shop/files/5_d2d4cfd4-fb0e-4566-b6a7-8ff9aaaa06ce_large.jpg?v=1683790128")0% 30% /  500% no-repeat',
      'TLPP': 'url("https://www.enamor.co.in/cdn/shop/files/5_eb8ecf80-5f52-46a4-a872-d2e1477beb61.jpg?v=1683790138")0% 30% /  500% no-repeat',
      'PHB': '#E78A84',
      'OLT':'#E9E2D7',
      'BRI':'#B82230',
      'BDE': '#E2C2BF',
      'PBH':'#D0A095',
      'TSE': '#8DC8D0',
      'PHP':'#EAD4CC',
      'MFL': 'url("https://www.enamor.co.in/cdn/shop/products/6_888.jpg?v=1676462012")50% 100% /  800% no-repeat',  
      'GRS': 'linear-gradient(to left, #341917 50%, #E4C7A7 50%)',
      'WHG': 'linear-gradient(to left, #FFFFFF 50%, #d8d7dc 50%)',
      'DHP': 'url("https://www.enamor.co.in/cdn/shop/products/5_1089.jpg?v=1676464602")50% 80% /  800% no-repeat',  
      'MMV': 'url("https://www.enamor.co.in/cdn/shop/products/5_1553.jpg?v=1676466172")50% 80% /  800% no-repeat',  
      'MLP': 'url("https://www.enamor.co.in/cdn/shop/products/1_2024_1_2.jpg?v=1676460147")50% 82% /  800% no-repeat',  
      'PFI': '#FEE0E0',
      'ALS': '#ECD7D7',
      'LSBNBL': '#1B2032',
      'OCH': '#D4979E',
      'PSTLIL':'#E8DDEA',
      'ARO': 'url("https://www.enamor.co.in/cdn/shop/products/6_869_5.jpg?v=1676466323")50% 82% /  800% no-repeat',
      'AUM': 'url("https://www.enamor.co.in/cdn/shop/products/4_1092_1_4.jpg?v=1676458943")60% 86% /  1200% no-repeat',
      'CLM':'#F0EAE5',
      'WFM': 'url("https://www.enamor.co.in/cdn/shop/files/ENAMORDAY-1_4624_Details_6fbe6d62-5cd6-4f86-9c39-44d156c0e8d8.jpg?v=1718885423")60% 86% /  1200% no-repeat',
      'MNPP': 'url("https://www.enamor.co.in/cdn/shop/products/f097_midnight_peony_print_7.jpg?v=1700657442")0% 30% /  500% no-repeat',
      'LCR': 'url("https://www.enamor.co.in/cdn/shop/products/6_459_17.jpg?v=1676464469")100% 30% /  500% no-repeat',
      'NISH':'#372C3B',
     
      'NAVY': '#242638',
      'GOBBLU': '#A5BBCF',
      'JETBLK': '#000000',
      'OLVNT':'#483E36',
      'ROUGE':'#EEA49F',
      'HTMBCO': 'url("https://www.enamor.co.in/cdn/shop/files/5_f3f32b28-5db7-4c42-aba8-97fc355e081d.jpg?v=1709016268")50% 60% /  500% no-repeat',
      'PFPGCO': 'url("https://www.enamor.co.in/cdn/shop/files/5_bec821e4-f5ba-4c0c-a013-6048a8ae8005.jpg?v=1709016265")50% 60% /  500% no-repeat',
  };
  return colorMap[color.toUpperCase()] || "";
}

function getContrastColor(hexColor) {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white based on luminance
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

function createColorContainer(item, color) {
  const backgroundColor = getBackgroundColor(color);
  const textColor = backgroundColor
    ? getContrastColor(backgroundColor)
    : "#000000";
  const containerStyle = backgroundColor
    ? `background-color: ${backgroundColor}; color: ${textColor};`
    : "border: 1px solid #ccc;";

  return `
      <div class="color-container" style="${containerStyle}" data-color="${color}">
          <h4>${color}</h4>
          <div class="size-quantity-grid" style="display: none;">
              ${item.sizes
                .map(
                  (size) => `
                  <div class="size-quantity-row">
                      <label class="size-label">${size}</label>
                      <input type="number" name="qty_${color}_${size}" min="0" class="quantity-input">
                  </div>
              `
                )
                .join("")}
          </div>
      </div>
  `;
}

function handleNewColorClick(event) {
  event.stopPropagation();
  const colorName = prompt("Enter the name of the new color:");
  if (colorName && colorName.trim() !== "") {
      const newColorName = `${colorName.trim()}(N)`;
      const itemName = document.querySelector("#itemDetailsContainer h3").textContent;
      const item = items.find(i => i.name === itemName);
      if (item) {
          item.colors.push(newColorName);
          showItemDetails(item);
      }
  }
}
//--------- User Interface Navigation
function returnToHomepage() {
  document.getElementById("partySearch").value = "";
  document.getElementById("itemSearch").value = "";
  cart = [];
  updateCartSummary();

  const itemDetailsContainer = document.getElementById("itemDetailsContainer");
  if (itemDetailsContainer) {
    itemDetailsContainer.remove();
  }

  loadPendingOrders(); // Refresh the pending orders list
  console.log("Returned to homepage");
}

function showItemDetails(item) {
  const existingDetailsContainer = document.getElementById(
    "itemDetailsContainer"
  );
  if (existingDetailsContainer) {
    existingDetailsContainer.remove();
  }

  const detailsContainer = document.createElement("div");
  detailsContainer.id = "itemDetailsContainer";
  detailsContainer.innerHTML = `
      <h3 style="text-align: center;">${item.name}</h3>
      <div class="color-containers">
          ${item.colors
            .map((color) => createColorContainer(item, color))
            .join("")}
          ${createColorContainer(item, "[new color]")}
      </div>
  `;

  const itemList = document.getElementById("itemList");
  itemList.insertAdjacentElement("afterend", detailsContainer);

  // Add click event listeners to color containers
  detailsContainer.querySelectorAll(".color-container").forEach((container) => {
    container.addEventListener("click", handleColorContainerClick);
  });

  // Add event listener for the [new color] container
  const newColorContainer = detailsContainer.querySelector('.color-container[data-color="[new color]"]');
  newColorContainer.addEventListener("click", handleNewColorClick);
} 

function resetItemSelection() {
  document.getElementById("itemSearch").value = "";
  const itemDetailsContainer = document.getElementById("itemDetailsContainer");
  if (itemDetailsContainer) {
    itemDetailsContainer.remove();
  }
}


// ------------------Audio Feedback
function playConfirmationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

function playAdvancedConfirmationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create oscillators
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  
  // Create gain nodes
  const gainNode1 = audioContext.createGain();
  const gainNode2 = audioContext.createGain();
  
  // Configure oscillators
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880, audioContext.currentTime); // A5
  
  // Configure gain nodes
  gainNode1.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode1.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
  gainNode1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
  
  gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.2);
  gainNode2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.6);
  
  // Connect nodes
  osc1.connect(gainNode1);
  osc2.connect(gainNode2);
  gainNode1.connect(audioContext.destination);
  gainNode2.connect(audioContext.destination);
  
  // Start and stop the sound
  osc1.start(audioContext.currentTime);
  osc2.start(audioContext.currentTime + 0.1);
  osc1.stop(audioContext.currentTime + 0.5);
  osc2.stop(audioContext.currentTime + 0.6);
} 

//----------------// Notifications
function sendTelegramNotification(partyName, totalQuantity, orderNumber, imgData) {
  const token = "6489265710:AAFx6-OaL09SpByMPyfiQBmgetvbtx0InyI";
  const chatId = "-1002170737027";
  const message = `New order received:\nParty Name: ${partyName}\nTotal Quantity: ${totalQuantity}\nOrder Number: ${orderNumber}`;

  // First, send the text message
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
    }),
  })
    .then((response) => response.json())
    .then((data) => console.log("Telegram text notification sent:", data))
    .catch((error) =>
      console.error("Error sending Telegram text notification:", error)
    );

  // Then, send the image
  // Convert base64 image data to blob
  const byteCharacters = atob(imgData.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {type: 'image/png'});

  // Create FormData and append the image
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', blob, 'order_summary.png');

  // Send the image
  fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => console.log("Telegram image sent:", data))
    .catch(error => console.error("Error sending Telegram image:", error));
}


//------------ Item and Cart Management
function calculateTotalQuantity() {
  return cart.reduce((total, item) => {
    return (
      total +
      Object.values(item.colors).reduce((itemTotal, color) => {
        return (
          itemTotal +
          Object.values(color).reduce((colorTotal, qty) => colorTotal + qty, 0)
        );
      }, 0)
    );
  }, 0);
}

function updateItemSearchDatalist() {
  const datalist = document.getElementById("itemList");
  datalist.innerHTML = "";
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name;
    datalist.appendChild(option);
  });
}

function addNewItem(itemName) {
  if (!items.some((item) => item && item.name === itemName)) {
      // Create a modal dynamically
      const modal = document.createElement("div");
      modal.className = "modal fade";
      modal.id = "newItemModal";
      modal.setAttribute("tabindex", "-1");
      modal.innerHTML = `
          <div class="modal-dialog modal-lg">
              <div class="modal-content">
                  <div class="modal-header">
                      <h5 class="modal-title">Add New Item</h5>
                      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                      <div class="mb-3">
                          <label for="itemName" class="form-label">Item Name</label>
                          <input type="text" class="form-control" id="itemName" required>
                      </div>
                      <div class="row">
                          <div class="col-md-6">
                              <h6>Number Cup Size</h6>
                              <div id="numCupSizes" class="row"></div>
                              <div class="mt-2">
                                  <input type="text" class="form-control" id="customNumCupSize" placeholder="Enter custom size">
                              </div>
                          </div>
                          <div class="col-md-6">
                              <h6>General Size</h6>
                              <div id="generalSizes" class="row"></div>
                              <div class="mt-2">
                                  <input type="text" class="form-control" id="customGeneralSize" placeholder="Enter custom size">
                              </div>
                          </div>
                      </div>
                  </div>
                  <div class="modal-footer">
                      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                      <button type="button" class="btn btn-primary" id="saveNewItem">Save Item</button>
                  </div>
              </div>
          </div>
      `;
      document.body.appendChild(modal);

      const newItemModal = new bootstrap.Modal(document.getElementById("newItemModal"));

      const numCupSizes = ["32B", "32C", "32D", "32Z", "34B", "34C", "34D", "34Z", "36B", "36C", "36D", "36Z", "38B", "38C", "38D", "38Z", "40B", "40C", "40D", "42B", "42C"];
      const generalSizes = ["XS", "S", "M", "L", "XL", "2XL"];

      const numCupSizesContainer = document.getElementById("numCupSizes");
      const generalSizesContainer = document.getElementById("generalSizes");

      // Function to create checkbox in a column layout
      function createCheckbox(size, container) {
          const col = document.createElement("div");
          col.className = "col-6 mb-2";
          col.innerHTML = `
              <div class="form-check">
                  <input class="form-check-input" type="checkbox" value="${size}" id="${size}">
                  <label class="form-check-label" for="${size}">${size}</label>
              </div>
          `;
          container.appendChild(col);
      }

      // Create Number Cup Size checkboxes
      numCupSizes.forEach(size => createCheckbox(size, numCupSizesContainer));

      // Create General Size checkboxes
      generalSizes.forEach(size => createCheckbox(size, generalSizesContainer));

      // Function to handle custom size input
      function handleCustomSizeInput(inputId, containerid) {
          const customSizeInput = document.getElementById(inputId);
          const container = document.getElementById(containerid);

          customSizeInput.addEventListener("blur", () => {
              const customSize = customSizeInput.value.trim();
              if (customSize) {
                  createCheckbox(customSize, container);
                  customSizeInput.value = "";
              }
          });
      }

      // Set up custom size inputs
      handleCustomSizeInput("customNumCupSize", "numCupSizes");
      handleCustomSizeInput("customGeneralSize", "generalSizes");

      // Pre-fill the item name
      document.getElementById("itemName").value = itemName;

      document.getElementById("saveNewItem").addEventListener("click", function () {
          const itemName = document.getElementById("itemName").value.trim();
          if (!itemName) {
              alert("Please enter an item name.");
              return;
          }

          const selectedSizes = [
              ...document.querySelectorAll("#numCupSizes input:checked"),
              ...document.querySelectorAll("#generalSizes input:checked")
          ].map(input => input.value);

          if (selectedSizes.length === 0) {
              alert("Please select at least one size.");
              return;
          }

          const newItem = { name: itemName, sizes: selectedSizes, colors: ["Any Color"] };
          items.push(newItem);
          items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

          console.log(`Added new item: ${itemName}`);
          alert(`New item "${itemName}" has been added successfully.`);
          newItemModal.hide();
          document.body.removeChild(modal);
          
          document.getElementById("itemSearch").value = itemName;
          document.getElementById("itemList").style.display = "none";
          showItemDetails(newItem);
      });

      newItemModal.show();
  } else {
      console.log(`Item "${itemName}" already exists.`);
      alert(`Item "${itemName}" already exists in the list.`);
  }
} 

function getTotalQuantity(cartItems) {
  return cartItems.reduce((total, item) => total + item.total, 0);
}

function updateCartButtonText(totalQuantity) {
  const cartButton = document.getElementById("saveOrderBtn");
  cartButton.textContent = `Process Order`;
}

function addToCart() {
  const itemName = document.getElementById("itemSearch").value;
  const item = items.find((i) => i.name === itemName);

  if (!item) {
      alert("Please select a valid item.");
      return;
  }

  const cartItem = {
      name: itemName,
      colors: {},
  };

  let itemAdded = false;
  let itemTotalQuantity = 0;

  // Include all colors, including the new ones with (N)
  item.colors.forEach((color) => {
      cartItem.colors[color] = {};
      item.sizes.forEach((size) => {
          const qty =
              parseInt(
                  document.querySelector(`input[name="qty_${color}_${size}"]`).value
              ) || 0;
          if (qty > 0) {
              cartItem.colors[color][size] = qty;
              itemAdded = true;
              itemTotalQuantity += qty;
          }
      });
  });

  if (!itemAdded) {
      alert("Please select at least one size and quantity.");
      return;
  }

  const existingItemIndex = cart.findIndex((item) => item.name === itemName);
  if (existingItemIndex !== -1) {
      // Merge quantities for existing item
      Object.keys(cartItem.colors).forEach((color) => {
          if (!cart[existingItemIndex].colors[color]) {
              cart[existingItemIndex].colors[color] = {};
          }
          Object.keys(cartItem.colors[color]).forEach((size) => {
              if (cart[existingItemIndex].colors[color][size]) {
                  cart[existingItemIndex].colors[color][size] +=
                      cartItem.colors[color][size];
              } else {
                  cart[existingItemIndex].colors[color][size] =
                      cartItem.colors[color][size];
              }
          });
      });
  } else {
      cart.push(cartItem);
  }

  updateCartSummary();
  updateCartButtonText(calculateTotalQuantity());
  updateItemDetailsAfterAddToCart(item);
}

function updateQuantity(size, change) {
  const input = document.getElementById(`qty_${size}`);
  if (input) {
    let newValue = parseInt(input.value) + change;
    newValue = Math.max(0, newValue); // Ensure non-negative value
    input.value = newValue;
  }
}

function updateItemDetailsAfterAddToCart(item) {
  const detailsContainer = document.getElementById("itemDetailsContainer");
  if (detailsContainer) {
    const colorContainers =
      detailsContainer.querySelectorAll(".color-container");
    colorContainers.forEach((container) => {
      const color = container.dataset.color;
      const sizeQuantityGrid = container.querySelector(".size-quantity-grid");
      const inputs = sizeQuantityGrid.querySelectorAll('input[type="number"]');
      inputs.forEach((input) => {
        input.value = ""; // Reset all inputs
      });
    });
  }

  // Optionally, you can add a visual feedback that the item was added to the cart
  showAddedToCartFeedback();
}

function showAddedToCartFeedback() {
  const feedback = document.createElement("div");
  feedback.textContent = "Added to cart";
  feedback.style.position = "fixed";
  feedback.style.top = "20px";
  feedback.style.right = "20px";
  feedback.style.backgroundColor = "#4CAF50";
  feedback.style.color = "white";
  feedback.style.padding = "10px";
  feedback.style.borderRadius = "5px";
  feedback.style.zIndex = "1000";
  document.body.appendChild(feedback);

  setTimeout(() => {
    feedback.remove();
  }, 2000);
}

// --------------Cart Summary
function updateCartSummary() {
  const cartSummary =
    document.getElementById("cartSummary") || createCartSummaryTable();
  const tbody = cartSummary.querySelector("tbody");
  tbody.innerHTML = "";

  let totalQuantity = 0;

  cart.forEach((item, itemIndex) => {
    Object.entries(item.colors).forEach(([color, sizes]) => {
      let colorTotal = 0;
      let sizesAndQuantities = [];

      Object.entries(sizes).forEach(([size, qty]) => {
        if (qty > 0) {
          sizesAndQuantities.push(`${size}/${qty}`);
          colorTotal += qty;
          totalQuantity += qty;
        }
      });

      if (colorTotal > 0) {
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>${item.name} (${color})</td>
                    <td>${sizesAndQuantities.join(", ")}</td>
                    <td>${colorTotal}</td>
                `;
        row.classList.add("clickable-row");
        row.addEventListener("click", () =>
          showEditItemModal(itemIndex, color, false)
        );
        tbody.appendChild(row);
      }
    });
  });

  // Update total quantity in the cart button
  updateCartButtonText(totalQuantity);
}

function createCartSummaryTable() {
  const table = document.createElement("table");
  table.id = "cartSummary";
  table.className = "table table-bordered mt-4";
  table.innerHTML = `
        <thead>
            <tr>
                <th>Item Name & Color</th>
                <th>Size and Qty</th>
                <th>(T)</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
  document.getElementById("orders").appendChild(table);
  return table;
}

function editCartSummaryItem(
  itemIndex,
  colorIndex,
  isOrderSummaryModal = false
) {
  console.log("editCartSummaryItem called with:", {
    itemIndex,
    colorIndex,
    isOrderSummaryModal,
  });

  try {
    const item = cart[itemIndex];
    if (!item) {
      console.error("Item not found in cart:", itemIndex);
      alert("Error: Item not found in cart.");
      return;
    }

    const colorKeys = Object.keys(item.colors);
    const color = colorKeys[colorIndex];
    if (!color) {
      console.error("Color not found for item:", {
        itemIndex,
        colorIndex,
        colorKeys,
      });
      alert("Error: Color not found for item.");
      return;
    }

    const sizes = Object.keys(item.colors[color]);
    let newTotal = 0;

    sizes.forEach((size) => {
      const newQty = parseInt(document.getElementById(`qty_${size}`).value);
      if (newQty > 0) {
        item.colors[color][size] = newQty;
        newTotal += newQty;
      } else {
        delete item.colors[color][size];
      }
    });

    if (newTotal === 0) {
      // If all quantities for this color are 0, remove the color
      delete item.colors[color];
      if (Object.keys(item.colors).length === 0) {
        // If no colors left, remove the item from cart
        cart.splice(itemIndex, 1);
      }
    }

    updateCartSummary();
    if (isOrderSummaryModal) {
      updateModalCartSummary();
    }

    console.log("Cart updated:", cart);
  } catch (error) {
    console.error("Error in editCartSummaryItem:", error);
    alert(
      "An error occurred while trying to save the changes. Please try again."
    );
  }
}
function deleteCartItem(itemIndex, color, isOrderSummaryModal) {
  const item = cart[itemIndex];
  delete item.colors[color];
  if (Object.keys(item.colors).length === 0) {
    cart.splice(itemIndex, 1);
  }

  updateCartSummary();
  if (isOrderSummaryModal) {
    updateModalCartSummary();
  }
} 

// --------Modals
function createModal(partyName, dateTime, orderNumber) {
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.id = "orderConfirmationModal";
  modal.setAttribute("tabindex", "-1");
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Order Confirmation</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p><strong>Party Name:</strong> ${partyName}</p>
          <p><strong>Date and Time:</strong> ${new Date(dateTime).toLocaleString()}</p>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;
  return modal;
}


function updateModalContent(orderNumber) {
  document.getElementById("orderNumberSpan").textContent = orderNumber;
}


function showOrderSummaryModal() {
  console.log("showOrderSummaryModal function called");
  try {
    // Remove existing modal if present
    const existingModal = document.getElementById("orderSummaryModal");
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "orderSummaryModal";
    modal.setAttribute("tabindex", "-1");
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Order Summary</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Loading order summary...</p>
          </div>
          <div class="modal-footer flex-column align-items-stretch">
            <div class="mb-3 w-100">
              <label for="orderNote" class="form-label">Order Note:</label>
              <textarea class="form-control" id="orderNote" rows="3" placeholder="Enter any special instructions here..."></textarea>
            </div>
            <div class="d-flex justify-content-end">
              <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary" id="placeOrderBtn">Place Order</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const modalInstance = new bootstrap.Modal(document.getElementById("orderSummaryModal"));
    modalInstance.show();

    console.log("Modal created and shown");

    // We'll add the content after the modal is shown
    setTimeout(() => {
      try {
        const modalBody = document.querySelector("#orderSummaryModal .modal-body");
        modalBody.innerHTML = `
          <p><strong>Party Name:</strong> <span id="modalPartyName"></span></p>
          <div id="modalCartSummary"></div>
          <p><strong>Total Quantity:</strong> <span id="modalTotalQuantity"></span></p>
        `;

        document.getElementById("modalPartyName").textContent = document.getElementById("partySearch").value;
        updateModalCartSummary();

        // Add event listener to the Place Order button
        document.getElementById("placeOrderBtn").addEventListener("click", handlePlaceOrder);

        console.log("Modal content updated");
      } catch (innerError) {
        console.error("Error updating modal content:", innerError);
        document.querySelector("#orderSummaryModal .modal-body").innerHTML = `<p>Error loading order summary. Please try again.</p>`;
      }
    }, 100);
  } catch (error) {
    console.error("Error in showOrderSummaryModal:", error);
    alert("An error occurred while showing the order summary. Please try again.");
  }
}

/* function showOrderSummaryModal() {
  console.log("showOrderSummaryModal function called");
  try {
    // Remove existing modal if present
    const existingModal = document.getElementById("orderSummaryModal");
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "orderSummaryModal";
    modal.setAttribute("tabindex", "-1");
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Order Summary</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Loading order summary...</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="placeOrderBtn">Place Order</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const modalInstance = new bootstrap.Modal(document.getElementById("orderSummaryModal"));
    modalInstance.show();

    console.log("Modal created and shown");

    // We'll add the content after the modal is shown
    setTimeout(() => {
      try {
        const modalBody = document.querySelector("#orderSummaryModal .modal-body");
        modalBody.innerHTML = `
          <p><strong>Party Name:</strong> <span id="modalPartyName"></span></p>
          <div id="modalCartSummary"></div>
          <p><strong>Total Quantity:</strong> <span id="modalTotalQuantity"></span></p>
        `;

        document.getElementById("modalPartyName").textContent = document.getElementById("partySearch").value;
        updateModalCartSummary();

        // Add event listener to the Place Order button
        document.getElementById("placeOrderBtn").addEventListener("click", handlePlaceOrder);

        console.log("Modal content updated");
      } catch (innerError) {
        console.error("Error updating modal content:", innerError);
        document.querySelector("#orderSummaryModal .modal-body").innerHTML = `<p>Error loading order summary. Please try again.</p>`;
      }
    }, 100);


  } catch (error) {
    console.error("Error in showOrderSummaryModal:", error);
    alert("An error occurred while showing the order summary. Please try again.");
  } 
  
}*/
function showEditItemModal(itemIndex, color, isOrderSummaryModal = false) {
  const item = cart[itemIndex];
  const sizes = Object.keys(item.colors[color]);

  const existingModal = document.getElementById("editItemModal");
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.id = "editItemModal";
  modal.setAttribute("tabindex", "-1");
  modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Item: ${
                      item.name
                    } (${color})</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    ${sizes
                      .map(
                        (size) => `
                        <div class="mb-3 d-flex align-items-center">
                            <label class="form-label me-2 mb-0" style="width: 50px;">${size}</label>
                            <div class="input-group" style="width: 150px;">
                                <button class="btn btn-outline-secondary minus-btn" type="button" data-size="${size}">-</button>
                                <input type="number" class="form-control text-center" id="qty_${size}" value="${
                          item.colors[color][size] || 0
                        }" min="0" readonly>
                                <button class="btn btn-outline-secondary plus-btn" type="button" data-size="${size}">+</button>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger" id="deleteItemBtn">Delete Item</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="saveItemBtn">Save Changes</button>
                </div>
            </div>
        </div>
    `;
  document.body.appendChild(modal);

  const editModalInstance = new bootstrap.Modal(
    document.getElementById("editItemModal")
  );

  // Add event listeners for plus and minus buttons
  modal.querySelectorAll(".minus-btn").forEach((btn) => {
    btn.addEventListener("click", () => updateQuantity(btn.dataset.size, -1));
  });
  modal.querySelectorAll(".plus-btn").forEach((btn) => {
    btn.addEventListener("click", () => updateQuantity(btn.dataset.size, 1));
  });

  document.getElementById("saveItemBtn").addEventListener("click", () => {
    saveItemChanges(itemIndex, color, isOrderSummaryModal);
    editModalInstance.hide();
  });

  document.getElementById("deleteItemBtn").addEventListener("click", () => {
    deleteCartItem(itemIndex, color, isOrderSummaryModal);
    editModalInstance.hide();
  });

  editModalInstance.show();
}
function saveItemChanges(itemIndex, color, isOrderSummaryModal) {
  const item = cart[itemIndex];
  const sizes = Object.keys(item.colors[color]);
  let totalQuantity = 0;

  sizes.forEach((size) => {
    const newQty = parseInt(document.getElementById(`qty_${size}`).value);
    if (newQty > 0) {
      item.colors[color][size] = newQty;
      totalQuantity += newQty;
    } else {
      delete item.colors[color][size];
    }
  });

  if (totalQuantity === 0) {
    delete item.colors[color];
    if (Object.keys(item.colors).length === 0) {
      cart.splice(itemIndex, 1);
    }
  }

  updateCartSummary();
  if (isOrderSummaryModal) {
    updateModalCartSummary();
  }
}

function updateModalCartSummary() {
  const modalBody = document.querySelector("#orderSummaryModal .modal-body");
  if (!modalBody) {
    console.error("Modal body not found");
    return;
  }

  const partyName = document.getElementById("partySearch").value || "N/A";
  let totalQuantity = 0;

  let modalContent = `
        <p><strong>Party Name:</strong> ${partyName}</p>
        <table class="table table-bordered table-hover modal-cart-summary">
            <thead>
                <tr>
                    <th>Item Name & Color</th>
                    <th>Sizes and Qty</th>
                    <th>Item Total</th>
                </tr>
            </thead>
            <tbody>
    `;

  if (!Array.isArray(cart) || cart.length === 0) {
    modalContent += '<tr><td colspan="3">No items in cart</td></tr>';
  } else {
    cart.forEach((item, index) => {
      if (!item || typeof item !== "object") return;

      Object.entries(item.colors || {}).forEach(([color, sizes]) => {
        if (typeof sizes === "object") {
          let itemTotal = 0;
          let sizesAndQty = [];

          Object.entries(sizes).forEach(([size, qty]) => {
            if (qty > 0) {
              sizesAndQty.push(`${size}/${qty}`);
              itemTotal += qty;
              totalQuantity += qty;
            }
          });

          if (itemTotal > 0) {
            modalContent += `
                            <tr class="clickable-row" data-index="${index}" data-color="${color}">
                                <td>${item.name} (${color})</td>
                                <td>${sizesAndQty.join(", ") || "N/A"}</td>
                                <td>${itemTotal}</td>
                            </tr>
                        `;
          }
        }
      });
    });
  }

  modalContent += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2"><strong>Total Quantity</strong></td>
                    <td><strong>${totalQuantity}</strong></td>
                </tr>
            </tfoot>
        </table>
    `;

  modalBody.innerHTML = modalContent;

  // Add click event listener to rows
  modalBody.querySelectorAll(".clickable-row").forEach((row) => {
    row.addEventListener("click", function () {
      const itemIndex = parseInt(this.dataset.index);
      const color = this.dataset.color;
      showEditItemModal(itemIndex, color, true);
    });
  });
}

function showOrderConfirmationModal(order, imgData) {
  console.log("Showing order confirmation modal");
  
  // Remove any existing modal
  const existingModal = document.getElementById("orderConfirmationModal");
  if (existingModal) {
    existingModal.remove();
  }

  // Create the modal
  const modal = createModal(order.partyName, order.dateTime, order.orderNumber);
  
  // Add advanced animation to the modal
  const animationContainer = document.createElement('div');
  animationContainer.className = 'confirmation-animation';
  animationContainer.innerHTML = `
    <div class="circle"></div>
    <div class="checkmark"></div>
    <div class="pulse"></div>
  `;
  modal.querySelector('.modal-body').prepend(animationContainer);

  // Add styles for the animation
  const style = document.createElement('style');
  style.textContent = `
    .confirmation-animation {
      position: relative;
      width: 200px;
      height: 200px;
      margin: 20px auto;
    }
    .circle {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: #23b26d;
      opacity: 0;
      animation: circleAnimation 0.5s forwards;
    }
    .checkmark {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 30%;
      height: 60%;
      border-right: 12px solid white;
      border-bottom: 12px solid white;
      transform: translate(-50%, -60%) rotate(45deg) scale(0);
      animation: checkmarkAnimation 0.5s 0.5s forwards;
    }
    .pulse {
      position: absolute;
      top: -5%;
      left: -5%;
      width: 110%;
      height: 110%;
      border-radius: 50%;
      border: 5px solid #23b26d;
      opacity: 0;
      animation: pulseAnimation 2s 1s infinite;
    }
    @keyframes circleAnimation {
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes checkmarkAnimation {
      to { transform: translate(-50%, -60%) rotate(45deg) scale(1); }
    }
    @keyframes pulseAnimation {
      0% { transform: scale(1); opacity: 0.7; }
      100% { transform: scale(1.1); opacity: 0; }
    }
    .modified-order {
      color: #ff6600;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);

  // Update order number display
  const orderNumberElement = modal.querySelector('.order-number');
  if (orderNumberElement) {
    orderNumberElement.textContent = order.orderNumber;
    if (order.orderNumber.startsWith('Modified')) {
      orderNumberElement.classList.add('modified-order');
    }
  }

  document.body.appendChild(modal);

  // Initialize the modal
  let modalInstance;
  try {
    modalInstance = new bootstrap.Modal(document.getElementById("orderConfirmationModal"));
  } catch (error) {
    console.error("Error initializing modal:", error);
    alert("There was an error showing the order confirmation. Your order has been placed successfully.");
    return;
  }

  // Add event listener for modal hidden event
  modal.addEventListener('hidden.bs.modal', function () {
    window.location.reload();
  });

  // Show modal
  modalInstance.show();

  // Play advanced confirmation sound
  playAdvancedConfirmationSound();
  sendWebPushNotification(order.partyName);
  // Send notification to Telegram
  sendTelegramNotification(order.partyName, order.totalQuantity, order.orderNumber, imgData);

  // Update pending orders list
  loadPendingOrders();
}

function sendWebPushNotification(partyName) {
  const apiKey = 'b285a62d89f9a1576f806016b692f5b4';
  const token = '98413';

  const payload = {
    badge:'https://i.postimg.cc/BQ2J7HGM/03042020043247760-brlo.png',
    title: 'KA OMS',
    message: `New Order for ${partyName}`,
    target_url: 'https://ka-oms.netlify.app', // Replace with your website URL
    icon: 'https://i.postimg.cc/BQ2J7HGM/03042020043247760-brlo.png'
  };

  fetch('https://api.webpushr.com/v1/notification/send/all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webpushrKey': apiKey,
      'webpushrAuthToken': token
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => console.log('Notification sent:', data))
  .catch(error => console.error('Error sending notification:', error));
}

// Helper function to create the modal structure
function createModal(partyName, dateTime, orderNumber) {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'orderConfirmationModal';
  modal.setAttribute('tabindex', '-1');
  modal.setAttribute('aria-labelledby', 'orderConfirmationModalLabel');
  modal.setAttribute('aria-hidden', 'true');

  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="orderConfirmationModalLabel">Order Confirmation</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p>Thank you for your order!</p>
          <p>Party Name: ${partyName}</p>
          <p>Date & Time: ${new Date(dateTime).toLocaleString()}</p>
          <p>Order Number: <span class="order-number">${orderNumber}</span></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;

  return modal;
}


// ---------------Order Processing
// ---------------Order Processing

function handlePlaceOrder() {
  const placeOrderBtn = document.getElementById("placeOrderBtn");
  placeOrderBtn.disabled = true;
  placeOrderBtn.textContent = "Processing...";
  
  const partyName = document.getElementById("partySearch").value;
  const dateTime = new Date().toISOString();
  const orderDate = dateTime.split('T')[0];
  const orderNote = document.getElementById("orderNote").value.trim();

  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Calculate total quantity and rows properly
  let totalQuantity = 0;
  let totalRows = 0;
  cart.forEach(item => {
    let itemHasContent = false;
    Object.entries(item.colors).forEach(([color, sizes]) => {
      let colorTotal = 0;
      Object.entries(sizes).forEach(([size, qty]) => {
        colorTotal += qty;
      });
      if (colorTotal > 0) {
        totalRows++;
        itemHasContent = true;
        totalQuantity += colorTotal;
      }
    });
    if (itemHasContent) {
      totalRows++; // Add extra row for spacing between items
    }
  });
  
  // Set canvas dimensions
  canvas.width = 800;
  canvas.height = Math.max(600, 150 + (totalRows * 30));
  
  function createOrderSummaryImage() {
    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set text styles for header
    ctx.fillStyle = 'black';
    ctx.font = 'bold 22px Arial';
    
    // Add header
    ctx.fillText(`Order Summary - ${partyName}`, 40, 40);
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Date: ${orderDate}`, 40, 70);

    // Draw table header line
    ctx.beginPath();
    ctx.moveTo(40, 85);
    ctx.lineTo(760, 85);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Define column positions
    const columns = {
      item: { x: 40, width: 120 },
      color: { x: 180, width: 120 },
      sizeQty: { x: 320, width: 300 },
      total: { x: 640, width: 80 }
    };

    // Draw table headers
    let y = 110;
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Item', columns.item.x, y);
    ctx.fillText('Color', columns.color.x, y);
    ctx.fillText('Size/Quantity', columns.sizeQty.x, y);
    ctx.fillText('Total', columns.total.x, y);

    // Draw header underline
    ctx.beginPath();
    ctx.moveTo(40, y + 10);
    ctx.lineTo(760, y + 10);
    ctx.stroke();

    // Set font for table content
    ctx.font = '14px Arial';
    y += 35;

    // Track the starting y position
    const startY = y;
    let currentY = startY;

    // Draw table content
    cart.forEach((item, index) => {
      let itemTotal = 0;
      let itemHasContent = false;
      let firstValidColor = true; // Track first valid color for item name

      Object.entries(item.colors).forEach(([color, sizes]) => {
        let colorTotal = 0;
        let sizeQtyPairs = [];
        
        Object.entries(sizes).forEach(([size, qty]) => {
          if (qty > 0) {
            colorTotal += qty;
            itemTotal += qty;
            sizeQtyPairs.push(`${size}:${qty}`);
          }
        });

        if (colorTotal > 0) {
          itemHasContent = true;
          
          // Always draw item name for the first valid color
          if (firstValidColor) {
            ctx.fillText(item.name, columns.item.x, currentY);
            firstValidColor = false;
          }

          // Draw color
          ctx.fillText(color, columns.color.x, currentY);

          // Draw size/quantity pairs
          const sizeQtyText = sizeQtyPairs.join(', ');
          ctx.fillText(sizeQtyText, columns.sizeQty.x, currentY);

          // Draw total for this color
          ctx.fillText(colorTotal.toString(), columns.total.x, currentY);

          // Draw horizontal line
          ctx.beginPath();
          ctx.moveTo(40, currentY + 15);
          ctx.lineTo(760, currentY + 15);
          ctx.strokeStyle = '#e0e0e0';
          ctx.stroke();

          currentY += 30;
        }
      });

      // Add spacing between items if this item had content
      if (itemHasContent) {
        currentY += 10;
      }
    });

    // Draw final total line
    ctx.beginPath();
    ctx.moveTo(40, currentY + 5);
    ctx.lineTo(760, currentY + 5);
    ctx.strokeStyle = '#000';
    ctx.stroke();

    // Draw total quantity
    currentY += 30;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Total Quantity: ${totalQuantity}`, 40, currentY);

    // Add order note if present
    if (orderNote) {
      currentY += 40;
      ctx.fillText('Order Notes:', 40, currentY);
      ctx.font = '14px Arial';
      
      // Handle multiline notes
      const words = orderNote.split(' ');
      let line = '';
      const maxWidth = 700;
      
      words.forEach(word => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, 40, currentY);
          line = word + ' ';
          currentY += 20;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, 40, currentY);
    }

    return canvas.toDataURL('image/png');
  }

  try {
    // Generate the image
    const imgData = createOrderSummaryImage();
    
    // Save the image
    const link = document.createElement("a");
    link.href = imgData;
    link.download = `${partyName.replace(/\s+/g, "_")}_${dateTime.replace(/[:.]/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Continue with order processing...
    checkExistingOrder(partyName, orderDate)
      .then((existingOrder) => {
        if (existingOrder) {
          return new Promise((resolve) => {
            if (confirm(`Another order for ${partyName} on ${orderDate} already exists. Do you want to add to the same order?`)) {
              resolve({ merge: true, existingOrder });
            } else {
              resolve({ merge: false });
            }
          });
        } else {
          return { merge: false };
        }
      })
      .then(({ merge, existingOrder }) => {
        if (merge) {
          const mergedOrder = mergeOrders(existingOrder, {
            partyName: partyName,
            dateTime: dateTime,
            items: cart,
            status: "Pending",
            totalQuantity: totalQuantity,
            orderNote: orderNote
          });
          return saveOrderToFirebase(mergedOrder).then(() => mergedOrder);
        } else {
          return getNextOrderNumber().then((orderNumber) => {
            const newOrder = {
              orderNumber: orderNumber,
              partyName: partyName,
              dateTime: dateTime,
              items: cart,
              status: "Pending",
              totalQuantity: totalQuantity,
              orderNote: orderNote
            };
            return saveOrderToFirebase(newOrder).then(() => newOrder);
          });
        }
      })
      .then((order) => {
        console.log("Order saved successfully:", order);
        
        // Close the order summary modal
        const orderSummaryModal = bootstrap.Modal.getInstance(document.getElementById("orderSummaryModal"));
        if (orderSummaryModal) {
          orderSummaryModal.hide();
        }

        // Show the order confirmation modal
        try {
          showOrderConfirmationModal(order, imgData);
        } catch (error) {
          console.error("Error showing confirmation modal:", error);
          alert("Your order has been placed successfully, but there was an error showing the confirmation. Order number: " + order.orderNumber);
        }

        // Reset the cart and update UI
        try {
          resetCart();
          updateCartButtonText(0);
          console.log("Cart reset and UI updated");
        } catch (resetError) {
          console.error("Error resetting cart:", resetError);
        }

        // Update pending orders list
        loadPendingOrders();
      })
      .catch((error) => {
        console.error("Error in order placement process:", error);
        alert("An error occurred during the order process. Please try again.");
      })
      .finally(() => {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order";
      });
  } catch (error) {
    console.error("Error creating order summary image:", error);
    alert("An error occurred while creating the order summary. Please try again.");
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
  }
}
function checkExistingOrder(partyName, orderDate) {
  return firebase.database().ref("orders")
    .orderByChild("partyName")
    .equalTo(partyName)
    .once("value")
    .then((snapshot) => {
      let existingOrder = null;
      snapshot.forEach((childSnapshot) => {
        const order = childSnapshot.val();
        if (order.dateTime.split('T')[0] === orderDate) {
          existingOrder = { ...order, key: childSnapshot.key };
          return true; // Break the loop
        }
      });
      return existingOrder;
    });
}

function mergeOrders(existingOrder, newOrder) {
  console.log('Merging orders:', { existingOrder, newOrder });
  
  // Merge items by concatenating arrays instead of merging
  existingOrder.items = [...(existingOrder.items || []), ...(newOrder.items || [])];
  
  // Update total quantity
  existingOrder.totalQuantity = (existingOrder.totalQuantity || 0) + (newOrder.totalQuantity || 0);
  
  // Mark as modified
  existingOrder.orderNumber = `Modified ${existingOrder.orderNumber.replace('Modified ', '')}`;
  
  // Add a timestamp for the modification
  existingOrder.lastModified = new Date().toISOString();
  
  console.log('Merged order:', existingOrder);
  return existingOrder;
}
function mergeItems(existingItems, newItems) {
  console.log('Merging items:', { existingItems, newItems });
  let mergedItems = [...existingItems];
  let nextIndex = mergedItems.length;
  
  newItems.forEach((newItem) => {
    const existingItemIndex = mergedItems.findIndex(item => 
      item.id === newItem.id && item.color === newItem.color
    );
    
    if (existingItemIndex !== -1) {
      // Merge sizes for existing item
      mergedItems[existingItemIndex] = mergeSizes(mergedItems[existingItemIndex], newItem);
    } else {
      // Add new item at the next available index
      mergedItems[nextIndex] = { ...newItem };
      nextIndex++;
    }
  });
  
  console.log('Merged items:', mergedItems);
  return mergedItems;
}

function mergeSizes(existingItem, newItem) {
  console.log('Merging sizes:', { existingItem, newItem });
  const mergedItem = { ...existingItem };
  
  if (newItem.sizes && typeof newItem.sizes === 'object') {
    mergedItem.sizes = mergedItem.sizes || {};
    Object.entries(newItem.sizes).forEach(([size, quantity]) => {
      mergedItem.sizes[size] = (mergedItem.sizes[size] || 0) + quantity;
    });
  }
  
  console.log('Merged item:', mergedItem);
  return mergedItem;
}

function saveOrderToFirebase(order) {
  console.log('Saving order to Firebase:', order);
  
  if (order.key) {
    // Update existing order
    return firebase.database().ref(`orders/${order.key}`).set(order)
      .then(() => {
        console.log('Order updated successfully');
        return order;
      })
      .catch((error) => {
        console.error('Error updating order:', error);
        throw error;
      });
  } else {
    // Create new order
    return firebase.database().ref("orders").push(order)
      .then((ref) => {
        console.log('New order created successfully');
        order.key = ref.key;
        return order;
      })
      .catch((error) => {
        console.error('Error creating new order:', error);
        throw error;
      });
  }
}

function getNextOrderNumber(maxRetries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    function attempt(retriesLeft) {
      firebase
        .database()
        .ref("orderCounter")
        .transaction((current) => {
          return (current || 0) + 1;
        })
        .then((result) => {
          if (result.committed) {
            resolve(`K${result.snapshot.val()}`);
          } else {
            throw new Error("Failed to commit transaction");
          }
        })
        .catch((error) => {
          console.error(
            `Error getting next order number (${
              maxRetries - retriesLeft + 1
            }/${maxRetries}):`,
            error
          );
          if (retriesLeft > 0) {
            setTimeout(() => attempt(retriesLeft - 1), delay);
          } else {
            reject(
              new Error("Max retries reached. Unable to get next order number.")
            );
          }
        });
    }
    attempt(maxRetries);
  });
}


//----------------Miscellaneous
function createCategoryRadios(categories) {
  return `
        <div class="category-container">
            ${categories
              .map(
                (cat, index) => `
                <label>
                    <input type="radio" name="category" value="${cat}" ${
                  index === 0 ? "checked" : ""
                }>
                    ${cat}
                </label>
            `
              )
              .join("")}
        </div>
    `;
}

  //-------------------------------non important--------------------------------
 
  
  function loadNewItemsFromFirebase() {
    return firebase
      .database()
      .ref("items")
      .once("value")
      .then((snapshot) => {
        const firebaseItems = snapshot.val();
        if (firebaseItems) {
          // Convert Firebase object to array
          const firebaseItemsArray = Object.entries(firebaseItems).map(
            ([key, value]) => ({
              name: key.replace("_", "."),
              ...value,
            })
          );
  
          // Merge existing items with new items from Firebase
          items = items.filter(
            (item) =>
              !firebaseItemsArray.some((fbItem) => fbItem.name === item.name)
          );
          items = [...items, ...firebaseItemsArray];
  
          // Sort items by name
          items.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );
  
          // Update the item search datalist
          updateItemSearchDatalist();
  
          console.log("Items loaded from Firebase:", items);
        }
      })
      .catch((error) => {
        console.error("Error loading items from Firebase:", error);
      });
  }

  /*function calculateTotalQuantity() {
    return cart.reduce((total, item) => {
      return total + Object.values(item.colors).reduce((colorTotal, sizes) => {
        return colorTotal + Object.values(sizes).reduce((sizeTotal, qty) => sizeTotal + qty, 0);
      }, 0);
    }, 0);
  }*/
  
 
/*


*/
// Variables for modal control
let colorDetailsTimeout;
const colorDetailsModal = document.getElementById('colorDetailsModal');
const colorDetailsOverlay = document.getElementById('colorDetailsOverlay');
const colorPaletteIcon = document.getElementById('colorPaletteIcon');
const colorDetailsClose = document.getElementById('colorDetailsClose');

// Function to show modal
function showColorDetailsModal(item) {
    if (!item || !item.colorname) return;
    
    const colorDetailsList = document.getElementById('colorDetailsList');
    colorDetailsList.innerHTML = '';
    
    // Populate color details
    item.colorname.forEach(colorInfo => {
        const li = document.createElement('li');
        li.className = 'enamor-color-details-item';
        li.textContent = colorInfo;
        colorDetailsList.appendChild(li);
    });
    
    // Show modal and overlay
    colorDetailsModal.style.display = 'block';
    colorDetailsOverlay.style.display = 'block';
    
    // Set auto-close timeout
    clearTimeout(colorDetailsTimeout);
    colorDetailsTimeout = setTimeout(closeColorDetailsModal, 4500);
}

// Function to close modal
function closeColorDetailsModal() {
    colorDetailsModal.style.display = 'none';
    colorDetailsOverlay.style.display = 'none';
    clearTimeout(colorDetailsTimeout);
}

// Function to update color palette icon visibility
function updateColorPaletteIcon() {
    const itemDetailsContainer = document.getElementById('itemDetailsContainer');
    if (itemDetailsContainer) {
        const itemName = itemDetailsContainer.querySelector('h3')?.textContent;
        const currentItem = items.find(i => i.name === itemName);
        colorPaletteIcon.style.display = currentItem?.colorname ? 'inline' : 'none';
    } else {
        colorPaletteIcon.style.display = 'none';
    }
}

// Event listeners
colorPaletteIcon.addEventListener('click', () => {
    const itemName = document.querySelector('#itemDetailsContainer h3')?.textContent;
    const currentItem = items.find(i => i.name === itemName);
    showColorDetailsModal(currentItem);
});

colorDetailsClose.addEventListener('click', closeColorDetailsModal);
colorDetailsOverlay.addEventListener('click', closeColorDetailsModal);

// Observe DOM changes to update color palette icon visibility
const colorDetailsObserver = new MutationObserver(updateColorPaletteIcon);
colorDetailsObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// Initial check for icon visibility
updateColorPaletteIcon();


//data extraction
/*
Sub ConvertToJSON()
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    
    Dim ws As Worksheet
    Set ws = ActiveSheet
    
    Dim dict As Object
    Set dict = CreateObject("Scripting.Dictionary")
    
    ' Create standard size order dictionary
    Dim sizeOrder As Object
    Set sizeOrder = CreateObject("Scripting.Dictionary")
    sizeOrder.Add "XS", 1
    sizeOrder.Add "S", 2
    sizeOrder.Add "M", 3
    sizeOrder.Add "L", 4
    sizeOrder.Add "XL", 5
    sizeOrder.Add "2XL", 6
    
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "D").End(xlUp).Row
    
    ' Read all data into arrays first for faster processing
    Dim dataRange As Range
    Set dataRange = ws.Range("D2:K" & lastRow)
    Dim data As Variant
    data = dataRange.Value
    
    ' Process all rows in one pass
    Dim i As Long
    For i = 1 To UBound(data, 1)
        Dim currentName As String
        currentName = CStr(data(i, 1)) ' Column D
        
        If Not dict.exists(currentName) Then
            Dim item As Object
            Set item = CreateObject("Scripting.Dictionary")
            
            Set item("sizes") = CreateObject("Scripting.Dictionary")
            Set item("colors") = CreateObject("Scripting.Dictionary")
            Set item("colorname") = CreateObject("Scripting.Dictionary")
            
            item.Add "name", currentName
            dict.Add currentName, item
        End If
        
        ' Add size if not exists
        Dim currentSize As String
        currentSize = CStr(data(i, 7)) ' Column J
        If Len(Trim(currentSize)) > 0 Then
            If Not dict(currentName)("sizes").exists(currentSize) Then
                dict(currentName)("sizes").Add currentSize, currentSize
            End If
        End If
        
        ' Add color if not exists
        Dim currentColor As String
        currentColor = CStr(data(i, 3)) ' Column F
        If Len(Trim(currentColor)) > 0 Then
            If Not dict(currentName)("colors").exists(currentColor) Then
                dict(currentName)("colors").Add currentColor, currentColor
            End If
        End If
        
        ' Create base colorname key (combining F and G columns)
        Dim baseColorKey As String
        baseColorKey = currentColor & " : " & CStr(data(i, 4)) ' F and G columns
        
        ' Handle K column values with deduplication
        Dim kValue As String
        kValue = CStr(data(i, 8)) ' Column K
        
        If Len(Trim(baseColorKey)) > 0 Then
            Dim finalColorKey As String
            finalColorKey = baseColorKey
            
            If Len(Trim(kValue)) > 0 Then
                ' Check if we already have this base color
                Dim existingKey As Variant
                Dim foundKey As String
                foundKey = ""
                
                For Each existingKey In dict(currentName)("colorname").Keys
                    If Left(existingKey, Len(baseColorKey)) = baseColorKey Then
                        foundKey = existingKey
                        Exit For
                    End If
                Next existingKey
                
                If foundKey <> "" Then
                    ' Remove existing entry
                    dict(currentName)("colorname").Remove foundKey
                    ' Add combined K values with deduplication
                    Dim existingNumbers As String
                    If InStr(foundKey, ", ") > 0 Then
                        existingNumbers = Mid(foundKey, InStr(foundKey, ", ") + 2)
                        finalColorKey = baseColorKey & ", " & DeduplicateNumbers(existingNumbers & "," & kValue)
                    Else
                        finalColorKey = baseColorKey & ", " & kValue
                    End If
                Else
                    finalColorKey = baseColorKey & ", " & kValue
                End If
            End If
            
            If Not dict(currentName)("colorname").exists(finalColorKey) Then
                dict(currentName)("colorname").Add finalColorKey, finalColorKey
            End If
        End If
    Next i
    
    ' Generate JSON string
    Dim json As String
    json = "[" & vbNewLine
    
    Dim isFirst As Boolean
    isFirst = True
    
    Dim dictKey As Variant
    For Each dictKey In dict.Keys
        If Not isFirst Then json = json & "," & vbNewLine
        
        Dim currentItem As Object
        Set currentItem = dict(dictKey)
        
        json = json & Space(2) & "{" & vbNewLine & _
               Space(4) & """name"": """ & currentItem("name") & """," & vbNewLine & _
               Space(4) & """sizes"": " & SortedSizesToJSON(currentItem("sizes"), sizeOrder) & "," & vbNewLine & _
               Space(4) & """colors"": " & DictToJSONArray(currentItem("colors")) & "," & vbNewLine & _
               Space(4) & """colorname"": " & DictToJSONArray(currentItem("colorname")) & vbNewLine & _
               Space(2) & "}"
        
        isFirst = False
    Next dictKey
    
    json = json & vbNewLine & "]"
    
    ' Get Desktop path and create file path
    Dim desktopPath As String
    desktopPath = CreateObject("WScript.Shell").SpecialFolders("Desktop")
    Dim filePath As String
    filePath = desktopPath & "\output.json"
    
    ' Write to file
    Dim fileNum As Integer
    fileNum = FreeFile
    
    Open filePath For Output As #fileNum
        Print #fileNum, json
    Close #fileNum
    
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    
    MsgBox "JSON file has been created at: " & filePath, vbInformation
End Sub

' New function to deduplicate numbers
Private Function DeduplicateNumbers(ByVal numberString As String) As String
    Dim numbers() As String
    Dim uniqueDict As Object
    Set uniqueDict = CreateObject("Scripting.Dictionary")
    
    ' Split the string into an array
    numbers = Split(numberString, ",")
    
    ' Add each number to dictionary (automatically handles duplicates)
    Dim num As Variant
    For Each num In numbers
        num = Trim(num)
        If Len(num) > 0 Then
            If Not uniqueDict.exists(num) Then
                uniqueDict.Add num, num
            End If
        End If
    Next num
    
    ' Join unique numbers back together
    DeduplicateNumbers = Join(uniqueDict.Items, ",")
End Function

Private Function SortedSizesToJSON(dict As Object, sizeOrder As Object) As String
    ' First, separate standard and custom sizes
    Dim standardSizes As Object
    Dim customSizes As Object
    Set standardSizes = CreateObject("Scripting.Dictionary")
    Set customSizes = CreateObject("Scripting.Dictionary")
    
    Dim size As Variant
    For Each size In dict.Keys
        If sizeOrder.exists(size) Then
            standardSizes.Add sizeOrder(size), size
        Else
            customSizes.Add size, size
        End If
    Next size
    
    ' Combine sorted standard sizes with custom sizes
    Dim json As String
    json = "["
    
    ' Add standard sizes in order
    Dim isFirst As Boolean
    isFirst = True
    
    Dim i As Long
    For i = 1 To sizeOrder.Count
        For Each size In standardSizes.Keys
            If size = i Then
                If Not isFirst Then json = json & ","
                json = json & """" & standardSizes(size) & """"
                isFirst = False
            End If
        Next size
    Next i
    
    ' Add custom sizes
    For Each size In customSizes.Keys
        If Not isFirst Then json = json & ","
        json = json & """" & customSizes(size) & """"
        isFirst = False
    Next size
    
    json = json & "]"
    SortedSizesToJSON = json
End Function

Private Function DictToJSONArray(dict As Object) As String
    Dim json As String
    json = "["
    
    Dim isFirst As Boolean
    isFirst = True
    
    Dim key As Variant
    For Each key In dict.Keys
        If Not isFirst Then json = json & ","
        json = json & """" & dict(key) & """"
        isFirst = False
    Next key
    
    json = json & "]"
    DictToJSONArray = json
End Function

*/
