from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os
import requests

# Carrega as variáveis de ambiente
load_dotenv()

app = Flask(__name__)

# Configuração da API do Monday
MONDAY_API_KEY = os.getenv('MONDAY_API_KEY')
MONDAY_API_URL = os.getenv('MONDAY_API_URL')
MONDAY_BOARD_ID = os.getenv('MONDAY_BOARD_ID')

@app.route("/")
def home():
    return render_template("index.html")

@app.route('/report')
def report():
    # Obtém o ID do relatório da URL
    report_id = request.args.get('id')
    
    # Verifica se o ID foi fornecido
    if not report_id:
        return "ID do relatório não fornecido!", 400
        
    # Renderiza a página do relatório com os dados
    return render_template('report-v2.html', report_id=report_id)

@app.route('/api/monday/query', methods=['POST'])
def monday_query():
    """Endpoint para fazer queries GraphQL na API do Monday"""
    try:
        data = request.get_json()
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'Query não fornecida'}), 400
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': MONDAY_API_KEY,
            'API-Version': '2023-07'
        }
        
        response = requests.post(
            MONDAY_API_URL,
            json={'query': query},
            headers=headers
        )

        print(query)
        
        return jsonify(response.json())
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/monday/board-columns', methods=['GET'])
def get_board_columns():
    """Endpoint para buscar colunas de um board"""
    try:
        column_ids = request.args.get('column_ids', '')
        
        query = f"""
        query {{
          boards(ids: {MONDAY_BOARD_ID}) {{
            columns(ids: [{column_ids}]) {{
              id
              title
              settings_str
            }}
          }}
        }}
        """
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': MONDAY_API_KEY,
            'API-Version': '2023-07'
        }
        
        response = requests.post(
            MONDAY_API_URL,
            json={'query': query},
            headers=headers
        )
        
        return jsonify(response.json())
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
