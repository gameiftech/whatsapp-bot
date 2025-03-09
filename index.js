//require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const client = new Client({
    authStrategy: new LocalAuth()
});

// Exibir o QR Code para login
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// Avisar quando estiver pronto
client.on('ready', () => {
    console.log('✅ Bot do WhatsApp está online!');
});

// Função para verificar se o link de agendamento é válido
async function checkLinkValidity(link) {
    try {
        const response = await axios.head(link);
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

// Função para pegar resposta do ChatGPT
async function getChatGPTResponse(message) {
    const apiKey = process.env.OPENAI_API_KEY;

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: message }],
                max_tokens: 100
            },
            { headers: { Authorization: `Bearer ${apiKey}` } }
        );

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Erro ao obter resposta do ChatGPT:', error.message);
        return '⚠️ Desculpe, não consegui processar sua solicitação no momento.';
    }
}

// Função para respostas fixas
function getFixedResponse(userMessage) {
    const responses = {
        "1": "🕒 Horário de Funcionamento:\nSeg-Sex: 09h-12h, 13h30-18h\nSábado: 08h-18h\nDomingo: Fechado",
        "2": "💈 Serviços e Preços:\n✂️ Corte Masculino: R$ 25,00\n💇‍♀️ Corte Feminino: R$ 30,00\n👦 Corte Infantil: R$ 20,00\n✨ Luzes no Cabelo: R$ 40,00",
        "3": "📍 Edu Cabeleireiro\nR. José Dominicci, 692.1 - Jardim Morumbi, Bragança Paulista - SP, 12926-220\nClique no link abaixo para localização\nhttps://maps.app.goo.gl/AgG62LfdDfH9SfiK7",
        "4": "📅 Para agendar um horário, clique no link abaixo:\n👉 https://bit.ly/41CSZKa"
    };

    return responses[userMessage] || null;
}

// Função para verificar a mensagem de ativação para agendamento
function getGreetingResponse(userMessage) {
    // Convertendo a mensagem para minúsculo e removendo acentos
    const normalizedMessage = userMessage
        .toLowerCase()
        .normalize("NFD") // Decomposição de caracteres
        .replace(/[\u0300-\u036f]/g, ""); // Remover acentos

    // Palavras-chave de ativação
    const activationWords = ["agendar", "agenda", "horario", "horário"];

    // Verifica se a mensagem contém qualquer palavra de ativação
    for (const word of activationWords) {
        if (normalizedMessage.includes(word)) {
            return `Olá, sou o Edu, assistente virtual! Como posso te ajudar hoje?\n\nDigite uma das opções abaixo:\n1️⃣ - Horário de Funcionamento\n2️⃣ - Preços e Serviços\n3️⃣ - Nosso Endereço\n4️⃣ - Agendar um Horário`;
        }
    }

    return null;
}

// Função para simular o delay antes de enviar a mensagem
function sendDelayedMessage(from, message, delay = 2000) {
    setTimeout(() => {
        client.sendMessage(from, message);
    }, delay);
}

// Capturar mensagens do WhatsApp
client.on('message', async message => {
    const userMessage = message.body.toLowerCase();

    console.log(`📩 Mensagem recebida: ${userMessage}`);

    // Responde a saudações
    let response = getGreetingResponse(userMessage);
    
    if (response) {
        return sendDelayedMessage(message.from, response, 2000);
    }

    // Verifica se o usuário escolheu uma opção
    response = getFixedResponse(userMessage);

    // Se não houver resposta fixa, usa a OpenAI
    if (!response) {
        response = await getChatGPTResponse(userMessage);
    }

    // Envia a resposta com delay
    sendDelayedMessage(message.from, response, 2000);
});

// Inicializa o bot
client.initialize();
