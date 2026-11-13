/*
 * Product page text, by product number (product.html?id=N).
 * Sources for the facts: research_notes/Product page redesign/product_facts.md
 * (CIKS "Traditional Rice Varieties of Tamil Nadu", Plant Archives 2024, Scientific Reports 2025, NIFTEM, Nille et al. 2021).
 * House rules: no claims that a food treats, prevents or cures anything (FSSAI Advertising & Claims Regulations 2018);
 * no nutrient claims without the product's own lab values; anything only the label can confirm says so.
 *
 * Fields: tagline, generic, ingredients, highlights [{title,text}], about [paragraphs], stepsTitle, steps [..],
 *         storage, shelfLife (leave out until confirmed; the page then says "printed on the pack")
 */
window.PRODUCT_COPY = {
  1: {
    tagline: 'A dark-brown, bold-grained Tamil rice that cooks firm and separate.',
    generic: 'Rice, Karunguruvai variety',
    ingredients: 'Karunguruvai rice',
    highlights: [
      { title: 'Dark-brown grain', text: 'The husk is black and the rice inside is dark brown and bold.' },
      { title: 'Firm and fluffy', text: 'It holds its shape when cooked and swells more across the grain than most rices.' },
      { title: 'Idli and dosa', text: 'Traditionally ground for idli and dosa batter, and eaten as everyday rice.' },
    ],
    about: [
      'Karunguruvai is an old Tamil Nadu paddy grown in the Kuruvai and Navarai seasons. The name means "dark kuruvai": the grain is black in the husk and dark brown once hulled.',
      'Cooked, it stays firm and fluffy rather than sticky, with a coarse, wholesome bite. Serve it with sambar, rasam or kuzhambu, or soak and grind it for idli and dosa.',
    ],
    steps: [
      'Rinse the rice two or three times in fresh water.',
      'Soak for about 3 hours.',
      'Cook 1 cup of rice with 2½ cups of water in a pressure cooker for about 4 whistles.',
      'Rest for 10 minutes before opening, then fluff with a fork.',
    ],
    storage: 'Keep in an airtight container in a cool, dry place, away from sunlight.',
  },
  2: {
    tagline: 'Black Kavuni rice, the grain behind kavuni arisi payasam.',
    generic: 'Rice, Karuppu Kavuni (black) variety',
    ingredients: 'Karuppu Kavuni rice',
    highlights: [
      { title: 'Black grain', text: 'The bran is deep black from natural pigments; cooked rice turns purple-black.' },
      { title: 'For sweets and festive dishes', text: 'Valued by the Chettiar community, who cook it for special occasions and honoured guests.' },
      { title: 'Takes more water', text: 'It absorbs more water than other Tamil rices, so it needs a longer soak and cook.' },
    ],
    about: [
      'Karuppu Kavuni is a black-pericarp rice from Tamil Nadu. The Chettiar community has long served it on special days, most famously as kavuni arisi, a sweet of black rice, coconut and jaggery.',
      'It cooks firm and fluffy and keeps a slight chew. Besides sweets it can be used for idli and dosa, and it gives the batter a dark colour.',
    ],
    steps: [
      'Rinse well, then soak for several hours or overnight; it softens slowly.',
      'Cook with more water than you would use for white rice, in a pressure cooker or a pot, until the grains are tender.',
      'For a sweet: cook the soaked rice soft, then stir in jaggery and grated coconut or coconut milk, and simmer until thick.',
    ],
    storage: 'Keep in an airtight container in a cool, dry place, away from sunlight.',
  },
  3: {
    tagline: 'A short-season red rice that cooks soft and slightly sticky.',
    generic: 'Rice, Arubatham Kuruvai (red) variety',
    ingredients: 'Arubatham Kuruvai rice',
    highlights: [
      { title: 'Red grain', text: 'A red, medium-sized grain from a very short-duration paddy.' },
      { title: 'Soft when cooked', text: 'Its starch makes it soft and slightly sticky, good for tiffin dishes.' },
      { title: 'Many uses', text: 'Idli, dosa, idiyappam, puttu, kozhukattai, porridge and everyday meals.' },
    ],
    about: [
      'Arubatham Kuruvai, "the sixtieth-day kuruvai", is named for how quickly the crop matures. It is widely grown in Kanyakumari district.',
      'The red grain cooks soft and a little sticky, which suits tiffin: idli and dosa batter, idiyappam, puttu and kozhukattai. It also makes a good rice porridge.',
    ],
    steps: [
      'Rinse two or three times and soak for a few hours.',
      'Cook in a pressure cooker with a little more water than you use for white rice, until soft.',
      'For batter, soak the rice separately from the urad dal and grind as usual.',
    ],
    storage: 'Keep in an airtight container in a cool, dry place, away from sunlight.',
  },
  4: {
    tagline: 'A slender red rice from Tamil Nadu that cooks soft.',
    generic: 'Rice, Poongar (red) variety',
    ingredients: 'Poongar rice',
    highlights: [
      { title: 'Slender red grain', text: 'A long, slim red grain.' },
      { title: 'Soft texture', text: 'Lower in amylose than many rices, so it cooks soft and slightly sticky.' },
      { title: 'Everyday rice', text: 'Eat it with kuzhambu or rasam, or use it for kanji.' },
    ],
    about: [
      'Poongar is a traditional red rice of Tamil Nadu. The grain is slender and red, and in tests it was among the denser grains of the Tamil varieties studied.',
      'It cooks soft and a little sticky. Serve it as everyday rice with kuzhambu, rasam or curd, or cook it thin for kanji.',
    ],
    steps: [
      'Rinse two or three times and soak for a few hours.',
      'Cook in a pressure cooker with a little more water than for white rice, until soft.',
      'Rest for a few minutes before serving.',
    ],
    storage: 'Keep in an airtight container in a cool, dry place, away from sunlight.',
  },
  5: {
    tagline: 'The "bridegroom’s rice": a red, bold grain from a long Samba season.',
    generic: 'Rice, Mappillai Samba (red) variety',
    ingredients: 'Mappillai Samba rice',
    highlights: [
      { title: 'Red, bold grain', text: 'A long-season Samba paddy of about 160 days, with a red, bold grain.' },
      { title: 'A name with a story', text: '"Mappillai" means bridegroom; its kanji was said to be a favourite of young men about to marry.' },
      { title: 'Table rice and more', text: 'Good boiled table rice, and for idli, dosa and aval appam.' },
    ],
    about: [
      'Mappillai Samba is grown in the Samba season and takes about 160 days to mature. The name means "bridegroom", from the old story about young men and its kanji.',
      'The red grain stays coarse and hearty when cooked. Eat it as table rice, cook it into kanji, or use it in idli and dosa batters and aval appam.',
    ],
    steps: [
      'Rinse two or three times.',
      'Soak for about 3 hours.',
      'Cook 1 cup of rice with 3 cups of water in a pressure cooker for about 4 whistles.',
      'Rest for 10 minutes before opening.',
    ],
    storage: 'Keep in an airtight container in a cool, dry place, away from sunlight.',
  },
  6: {
    tagline: 'A fine white rice named for the scent of the iluppai flower.',
    generic: 'Rice, Iluppai Poo Samba (white) variety',
    ingredients: 'Iluppai Poo Samba rice',
    highlights: [
      { title: 'Fine white grain', text: 'A small, fine, white grain from the Samba season.' },
      { title: 'Its own fragrance', text: 'The name comes from a fragrance likened to the iluppai (mahua) flower.' },
      { title: 'For payasam', text: 'Traditionally the rice of choice for kheer and payasam.' },
    ],
    about: [
      'Iluppai Poo Samba is a Samba-season rice with a fine white grain. It is named after the iluppai (mahua) flower, whose scent the grain is said to carry.',
      'It is best known as a payasam and kheer rice, and also makes a light everyday rice.',
    ],
    steps: [
      'Rinse gently two or three times; the grain is fine.',
      'Soak for 30 minutes to an hour.',
      'Cook with less water than the red rices need, until just tender.',
      'For payasam, cook it soft in milk, then add jaggery or sugar and cardamom.',
    ],
    storage: 'Keep in an airtight container in a cool, dry place, away from sunlight.',
  },
  7: {
    tagline: 'A white Kavuni rice, cooked for sweet pongal and festive dishes.',
    generic: 'Rice, Vellai Kavuni (white) variety',
    ingredients: 'Vellai Kavuni rice',
    highlights: [
      { title: 'White Kavuni', text: 'A white form of Kavuni rice, different from the black Karuppu Kavuni.' },
      { title: 'For sweets', text: 'Cooked soft for sweet pongal and payasam.' },
    ],
    about: [
      'Vellai Kavuni is a white Kavuni rice. Unlike Karuppu Kavuni it has no black bran, and it is cooked mainly for sweets such as sweet pongal and payasam.',
    ],
    steps: [
      'Rinse two or three times and soak for an hour or two.',
      'Cook until soft. For sweet pongal, cook with moong dal, then add jaggery, ghee and cardamom.',
    ],
    storage: 'Keep in an airtight container in a cool, dry place, away from sunlight.',
  },
  8: {
    tagline: 'Dried damask rose petals for gulkand, rose tea and rose milk.',
    generic: 'Dried rose petals (panneer rose)',
    ingredients: 'Dried rose petals',
    highlights: [
      { title: 'Shade-dried petals', text: 'Panneer rose petals, dried to keep their colour and scent.' },
      { title: 'In the kitchen', text: 'Gulkand, rose tea, rose milk, and a garnish for sweets and biryani.' },
    ],
    about: [
      'Panneer rose is the fragrant pink rose of South Indian homes and temples. The petals are dried in the shade so they keep their colour and scent.',
      'Steep them for rose tea, cook them with sugar for gulkand, add them to rose milk, or scatter them over kheer, lassi and biryani.',
    ],
    stepsTitle: 'How to use',
    steps: [
      'Rose tea: steep a teaspoon of petals in a cup of just-boiled water for 5 minutes, then strain.',
      'Gulkand: layer petals with sugar in a clean glass jar and keep it in the sun, stirring every few days, until it turns jammy.',
      'Garnish: crush a few petals over sweets, lassi or biryani just before serving.',
    ],
    storage: 'Keep in an airtight jar away from light and moisture.',
  },
  9: {
    tagline: 'Dried hibiscus flowers for a deep-red herbal infusion.',
    generic: 'Dried hibiscus flowers',
    ingredients: 'Dried hibiscus flowers',
    highlights: [
      { title: 'Deep red colour', text: 'The petals give a deep red infusion.' },
      { title: 'For infusions', text: 'Steep it as a tea, or chill it for a summer drink.' },
    ],
    about: [
      'These are whole hibiscus flowers, dried. Steeped in hot water they give a deep red infusion; sweeten it with jaggery or honey, or add lemon.',
      'If you are pregnant or take regular medicines, ask your doctor before drinking herbal infusions.',
    ],
    stepsTitle: 'How to use',
    steps: [
      'Steep 2 or 3 dried flowers in a cup of just-boiled water for 5 to 8 minutes.',
      'Strain, then sweeten to taste. Add lemon if you like it tart.',
      'For a cold drink, brew it stronger and pour over ice.',
    ],
    storage: 'Keep in an airtight jar away from light and moisture.',
  },
  10: {
    tagline: 'Sun-yellow avaram flowers, dried for avarampoo tea.',
    generic: 'Dried avaram flowers (Senna auriculata)',
    ingredients: 'Dried avaram flowers',
    highlights: [
      { title: 'Bright yellow flowers', text: 'The flowers of the avaram shrub, dried whole.' },
      { title: 'A South Indian tea', text: 'Brewed as avarampoo tea, a traditional herbal drink.' },
    ],
    about: [
      'Avaram (Senna auriculata) is a shrub with bright yellow flowers that grows wild across dry parts of South India. The dried flowers are brewed as avarampoo tea, a traditional herbal drink.',
      'If you are pregnant or take regular medicines, ask your doctor before drinking herbal infusions.',
    ],
    stepsTitle: 'How to use',
    steps: [
      'Simmer a teaspoon of dried flowers in a cup of water for a few minutes.',
      'Strain and drink warm, plain or with a little jaggery.',
    ],
    storage: 'Keep in an airtight jar away from light and moisture.',
  },
  11: {
    tagline: 'Blue butterfly pea flowers for a tea that changes colour with lemon.',
    generic: 'Dried butterfly pea flowers (Clitoria ternatea, sangu poo)',
    ingredients: 'Dried butterfly pea flowers',
    highlights: [
      { title: 'Deep blue', text: 'The dried flowers brew a clear, deep blue tea.' },
      { title: 'Turns violet', text: 'Add a squeeze of lemon and it turns violet-pink.' },
      { title: 'Natural colour', text: 'Use the tea to colour rice, lemonade or desserts blue.' },
    ],
    about: [
      'Sangu poo is the blue flower of the butterfly pea vine. Steeped in hot water it gives a deep blue tea that changes to violet when you add lemon or any other acid.',
      'Use it as a tea, in lemonade, or to colour rice and desserts.',
    ],
    stepsTitle: 'How to use',
    steps: [
      'Steep 5 or 6 dried flowers in a cup of hot water for 5 minutes, then strain.',
      'Add lemon juice to turn it violet, and honey to taste.',
      'For blue rice, cook the rice in the strained tea instead of water.',
    ],
    storage: 'Keep in an airtight jar away from light and moisture.',
  },
  12: {
    tagline: 'Rose syrup for making rose milk at home.',
    generic: 'Rose syrup (for rose milk)',
    about: [
      'Rose syrup for rose milk, the pink drink sold at every Tamil Nadu juice shop. Stir it into chilled milk, or use it in falooda and desserts.',
      'Ingredients, serving size and shelf life are printed on the bottle.',
    ],
    stepsTitle: 'How to use',
    steps: [
      'Stir the syrup into chilled milk, using the amount given on the bottle label.',
      'Add ice, or top with soaked basil seeds for falooda.',
      'Refrigerate after opening.',
    ],
    storage: 'Store in a cool, dry place. Refrigerate after opening.',
  },
  13: {
    tagline: 'Hibiscus syrup for a deep-red summer sherbet.',
    generic: 'Hibiscus sherbet (syrup)',
    about: [
      'A hibiscus syrup for sherbet: dilute it with chilled water or soda for a deep red summer drink.',
      'Ingredients, dilution and shelf life are printed on the bottle.',
    ],
    stepsTitle: 'How to use',
    steps: [
      'Dilute with chilled water or soda, using the ratio given on the bottle label.',
      'Add ice and a squeeze of lemon.',
      'Refrigerate after opening.',
    ],
    storage: 'Store in a cool, dry place. Refrigerate after opening.',
  },
  14: {
    tagline: 'Hand-pounded rice flour for soft idiyappam.',
    generic: 'Rice flour (hand-pounded) for idiyappam',
    about: [
      'Rice flour made from hand-pounded rice, for idiyappam (string hoppers), puttu and kozhukattai.',
      'Mix it with hot water and a pinch of salt into a soft dough, press it through an idiyappam mould onto idli plates, and steam. The rice variety used and the shelf life are printed on the pack.',
    ],
    steps: [
      'Put 1 cup of flour and a pinch of salt in a bowl.',
      'Add boiling water a little at a time and mix with a spoon into a soft, smooth dough.',
      'Press the dough through an idiyappam mould onto greased idli plates.',
      'Steam for 8 to 10 minutes. Serve with coconut milk, kurma or stew.',
    ],
    storage: 'Keep in an airtight container in a cool, dry place. Use within the date on the pack; flour keeps less long than whole rice.',
  },
  15: {
    tagline: 'A roasted black urad dal mix, cooked as a warm breakfast porridge.',
    generic: 'Black urad dal porridge mix',
    about: [
      'A roasted, ground mix based on black urad dal (black gram, ulundhu), cooked into a warm porridge for breakfast.',
      'The full ingredient list and shelf life are printed on the pack.',
    ],
    stepsTitle: 'How to cook',
    steps: [
      'Mix 2 tablespoons of the powder with a little water to make a smooth paste with no lumps.',
      'Add a glass of water or milk and bring to a boil, stirring.',
      'Simmer for a few minutes until it thickens. Sweeten with jaggery, or add salt and buttermilk for a savoury version.',
    ],
    storage: 'Keep in an airtight container in a cool, dry place.',
  },
  16: {
    tagline: 'Dried country figs ground to a fine powder.',
    generic: 'Dried fig powder',
    about: [
      'Country figs, dried and ground to a fine powder. Stir it into warm milk or porridge, blend it into smoothies, or use it in baking.',
      'Ingredients and shelf life are printed on the pack.',
    ],
    stepsTitle: 'How to use',
    steps: [
      'Stir a teaspoon or two into a glass of warm milk or into porridge.',
      'Blend into smoothies or milkshakes.',
      'Add to cake, cookie or ladoo mixes.',
    ],
    storage: 'Keep in an airtight container in a cool, dry place, away from moisture.',
  },
};
