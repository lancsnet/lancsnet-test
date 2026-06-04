from flask import Flask\napp = Flask(__name__)\n@app.route('/')\ndef index():\n return 'VSP PoC'\n
