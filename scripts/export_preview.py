"""Export the website as one portable HTML file without changing source assets."""
import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = (root / 'index.html').read_text()
images = {
    path.stem: 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode()
    for path in (root / 'assets').glob('*.png')
}
source = source.replace('<script src="quiz.js"></script>',
                        '<script>\n' + (root / 'quiz.js').read_text() + '\n</script>')
source = source.replace('assets/${b.img}.png', '${embeddedImages[b.img]}')
source = source.replace('assets/${c.img}.png', '${embeddedImages[c.img]}')
source = source.replace('assets/${q.img}.png', '${embeddedImages[q.img]}')
for name, url in images.items():
    source = source.replace('assets/' + name + '.png', url)
source = source.replace('<script>',
                        '<script>\nconst embeddedImages=' + json.dumps(images) + ';\n', 1)
output = root / 'Odd_Orbit_preview.html'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(source)
print(output)
