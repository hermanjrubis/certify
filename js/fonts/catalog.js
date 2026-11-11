/**
 * 122 Google Fonts Library Catalog and helpers.
 */

export const FONT_CATEGORIES = [
  { id: 'formal', label: 'Formal script' },
  { id: 'casual', label: 'Casual script' },
  { id: 'signature', label: 'Signature' },
  { id: 'serif', label: 'Classic serif' },
  { id: 'blackletter', label: 'Old English & medieval' },
  { id: 'sans', label: 'Modern sans' },
  { id: 'fun', label: 'Fun & handwritten' }
];

export const FONT_CATALOG = [
  // formal (24)
  { family: 'Great Vibes', category: 'formal' },
  { family: 'Alex Brush', category: 'formal' },
  { family: 'Allura', category: 'formal' },
  { family: 'Parisienne', category: 'formal' },
  { family: 'Pinyon Script', category: 'formal' },
  { family: 'Tangerine', category: 'formal' },
  { family: 'Italianno', category: 'formal' },
  { family: 'Rouge Script', category: 'formal' },
  { family: 'Arizonia', category: 'formal' },
  { family: 'Petit Formal Script', category: 'formal' },
  { family: 'Imperial Script', category: 'formal' },
  { family: 'Corinthia', category: 'formal' },
  { family: 'Luxurious Script', category: 'formal' },
  { family: 'Monsieur La Doulaise', category: 'formal' },
  { family: 'Lovers Quarrel', category: 'formal' },
  { family: 'Ballet', category: 'formal' },
  { family: 'Birthstone', category: 'formal' },
  { family: 'Ephesis', category: 'formal' },
  { family: 'Island Moments', category: 'formal' },
  { family: 'Lavishly Yours', category: 'formal' },
  { family: 'Euphoria Script', category: 'formal' },
  { family: 'League Script', category: 'formal' },
  { family: 'Princess Sofia', category: 'formal' },
  { family: 'Bonheur Royale', category: 'formal' },

  // casual (16)
  { family: 'Dancing Script', category: 'casual' },
  { family: 'Sacramento', category: 'casual' },
  { family: 'Satisfy', category: 'casual' },
  { family: 'Kaushan Script', category: 'casual' },
  { family: 'Yellowtail', category: 'casual' },
  { family: 'Cookie', category: 'casual' },
  { family: 'Courgette', category: 'casual' },
  { family: 'Pacifico', category: 'casual' },
  { family: 'Style Script', category: 'casual' },
  { family: 'Grand Hotel', category: 'casual' },
  { family: 'Damion', category: 'casual' },
  { family: 'Playball', category: 'casual' },
  { family: 'Norican', category: 'casual' },
  { family: 'Marck Script', category: 'casual' },
  { family: 'Rochester', category: 'casual' },
  { family: 'Clicker Script', category: 'casual' },

  // signature (14)
  { family: 'Mrs Saint Delafield', category: 'signature' },
  { family: 'Herr Von Muellerhoff', category: 'signature' },
  { family: 'Mr Dafoe', category: 'signature' },
  { family: 'Mr De Haviland', category: 'signature' },
  { family: 'Ms Madi', category: 'signature' },
  { family: 'WindSong', category: 'signature' },
  { family: 'Whisper', category: 'signature' },
  { family: 'Hurricane', category: 'signature' },
  { family: 'Kristi', category: 'signature' },
  { family: 'Dawning of a New Day', category: 'signature' },
  { family: 'La Belle Aurore', category: 'signature' },
  { family: 'Cedarville Cursive', category: 'signature' },
  { family: 'Homemade Apple', category: 'signature' },
  { family: 'MonteCarlo', category: 'signature' },

  // serif (28)
  { family: 'Cinzel', category: 'serif' },
  { family: 'Cinzel Decorative', category: 'serif' },
  { family: 'Playfair Display', category: 'serif' },
  { family: 'Cormorant Garamond', category: 'serif' },
  { family: 'Cormorant SC', category: 'serif' },
  { family: 'EB Garamond', category: 'serif' },
  { family: 'Marcellus', category: 'serif' },
  { family: 'Marcellus SC', category: 'serif' },
  { family: 'Libre Baskerville', category: 'serif' },
  { family: 'Lora', category: 'serif' },
  { family: 'Crimson Pro', category: 'serif' },
  { family: 'Cardo', category: 'serif' },
  { family: 'Prata', category: 'serif' },
  { family: 'Bodoni Moda', category: 'serif' },
  { family: 'Gilda Display', category: 'serif' },
  { family: 'Libre Caslon Display', category: 'serif' },
  { family: 'Spectral', category: 'serif' },
  { family: 'Old Standard TT', category: 'serif' },
  { family: 'Italiana', category: 'serif' },
  { family: 'Forum', category: 'serif' },
  { family: 'DM Serif Display', category: 'serif' },
  { family: 'Abril Fatface', category: 'serif' },
  { family: 'Yeseva One', category: 'serif' },
  { family: 'Sorts Mill Goudy', category: 'serif' },
  { family: 'IM Fell English', category: 'serif' },
  { family: 'Instrument Serif', category: 'serif' },
  { family: 'Bellefair', category: 'serif' },
  { family: 'Castoro Titling', category: 'serif' },

  // blackletter (10)
  { family: 'UnifrakturMaguntia', category: 'blackletter' },
  { family: 'UnifrakturCook', category: 'blackletter', weight: 700 },
  { family: 'Pirata One', category: 'blackletter' },
  { family: 'Grenze Gotisch', category: 'blackletter' },
  { family: 'Germania One', category: 'blackletter' },
  { family: 'Fruktur', category: 'blackletter' },
  { family: 'MedievalSharp', category: 'blackletter' },
  { family: 'Uncial Antiqua', category: 'blackletter' },
  { family: 'Almendra', category: 'blackletter' },
  { family: 'Fondamento', category: 'blackletter' },

  // sans (16)
  { family: 'Montserrat', category: 'sans' },
  { family: 'Poppins', category: 'sans' },
  { family: 'Raleway', category: 'sans' },
  { family: 'Josefin Sans', category: 'sans' },
  { family: 'Lato', category: 'sans' },
  { family: 'Nunito', category: 'sans' },
  { family: 'Outfit', category: 'sans' },
  { family: 'Quicksand', category: 'sans' },
  { family: 'Work Sans', category: 'sans' },
  { family: 'Bebas Neue', category: 'sans' },
  { family: 'Oswald', category: 'sans' },
  { family: 'Julius Sans One', category: 'sans' },
  { family: 'Tenor Sans', category: 'sans' },
  { family: 'Questrial', category: 'sans' },
  { family: 'Lexend', category: 'sans' },
  { family: 'Montserrat Alternates', category: 'sans' },

  // fun (14)
  { family: 'Caveat', category: 'fun' },
  { family: 'Kalam', category: 'fun' },
  { family: 'Patrick Hand', category: 'fun' },
  { family: 'Shadows Into Light', category: 'fun' },
  { family: 'Amatic SC', category: 'fun' },
  { family: 'Indie Flower', category: 'fun' },
  { family: 'Gloria Hallelujah', category: 'fun' },
  { family: 'Fredoka', category: 'fun' },
  { family: 'Baloo 2', category: 'fun' },
  { family: 'Comfortaa', category: 'fun' },
  { family: 'Lobster', category: 'fun' },
  { family: 'Chewy', category: 'fun' },
  { family: 'Sniglet', category: 'fun' },
  { family: 'Grandstander', category: 'fun' }
];

export function getFont(family) {
  const found = FONT_CATALOG.find(f => f.family.toLowerCase() === (family || '').toLowerCase());
  if (found) {
    return {
      family: found.family,
      category: found.category,
      weight: found.weight || 400
    };
  }
  return {
    family,
    category: null,
    weight: 400
  };
}

export function fontCssUrl(family, previewText = null) {
  const font = getFont(family);
  const formattedFamily = font.family.replace(/\s+/g, '+');
  let url = `https://fonts.googleapis.com/css2?family=${formattedFamily}`;
  if (font.weight && font.weight !== 400) {
    url += `:wght@${font.weight}`;
  }
  url += '&display=swap';
  if (previewText) {
    url += `&text=${encodeURIComponent(previewText)}`;
  }
  return url;
}

export function searchFonts(query = '', categoryId = null) {
  const q = (query || '').trim().toLowerCase();
  const cat = (categoryId && categoryId !== 'all') ? categoryId.toLowerCase() : null;

  return FONT_CATALOG.filter(font => {
    if (cat && font.category.toLowerCase() !== cat) return false;
    if (q && !font.family.toLowerCase().includes(q)) return false;
    return true;
  });
}
