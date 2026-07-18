# ALTAR VISION — Site statique (GitHub Pages)

Reproduction du site altarvision.com (Home / Media / Lore) en HTML/CSS/JS, prête à uploader.

## Structure

```
index.html          → Home (waitlist + Zenyth Outfit)
media/index.html    → Media (wallpapers, minecraft skin, connect)
lore/index.html     → Lore (audio + texte + personnages)
css/style.css       → styles (monochrome blanc sur noir, police Mikadan)
js/main.js          → carrousels + lecteur audio
assets/img/         → images (placeholder actuel : altar_graff_13.png, blanc d'origine)
assets/fonts/       → Mikadan_Regular.ttf (webfont auto-hébergée)
assets/audio/       → à créer : altar-lore.mp3
CNAME               → altarvision.com (domaine custom GitHub Pages)
```

## Mise en ligne (GitHub Pages)

1. Créer un repo GitHub (public), y pousser tout le contenu de ce dossier à la racine.
2. Repo → Settings → Pages → Source : `Deploy from a branch` → branche `main`, dossier `/ (root)`.
3. DNS OVH : enregistrement `CNAME` de `www` vers `<user>.github.io` + enregistrements `A` de l'apex vers les IP GitHub Pages (185.199.108.153 / .109 / .110 / .111).
4. Settings → Pages → Custom domain : `altarvision.com` → cocher **Enforce HTTPS** une fois le certificat émis.

## À remplacer avant/après mise en ligne

- **Images** : tous les `<img>` pointent vers `assets/img/altar_graff_13.png`. Chaque emplacement est marqué d'un commentaire `<!-- IMAGE À REMPLACER : ... -->`.
- **Klaviyo** : dans `index.html`, décommenter le script Klaviyo (head) avec ton `company_id`, puis coller l'embed du formulaire à l'endroit indiqué et supprimer le formulaire placeholder.
- **Audio du lore** : le mp3 pointe encore vers Framer. Le télécharger, le mettre dans `assets/audio/altar-lore.mp3` et changer le `src` dans `lore/index.html`.
- **Liens de téléchargement Framer** (`framerusercontent.com/...` : wallpapers HD/4K/GIF + skin Minecraft) : ils mourront à la résiliation de Framer. Ré-héberger les fichiers (Drive ou `assets/downloads/`).
- **Typos reprises du site actuel** (volontairement identiques) : `ALTAR COMUNITY`, `MEDDIA`, `ALTAR COORP LORE`.

## Test local

Ouvrir `index.html` dans un navigateur suffit (chemins relatifs, aucune dépendance à installer).
