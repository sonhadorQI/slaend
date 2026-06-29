const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let db;

// Conectar ao MongoDB
async function connectMongoDB() {
  try {
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db('StumbleLeague');
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error);
  }
}

// Definir slash commands
const commands = [
  {
    name: 'setusername',
    description: 'Alterar username de um usuário',
    options: [
      {
        name: 'id',
        description: 'Buscar usuário pelo ID e alterar username',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'user_id',
            description: 'ID do usuário no MongoDB',
            type: 3, // STRING
            required: true
          },
          {
            name: 'novo_username',
            description: 'Novo username',
            type: 3, // STRING
            required: true
          }
        ]
      },
      {
        name: 'username',
        description: 'Buscar usuário pelo username e alterar',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'username_atual',
            description: 'Username atual do usuário',
            type: 3, // STRING
            required: true
          },
          {
            name: 'novo_username',
            description: 'Novo username',
            type: 3, // STRING
            required: true
          }
        ]
      }
    ]
  }
];

// Registrar slash commands
async function registerCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    console.log('🔄 Registrando slash commands...');
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    
    console.log('✅ Slash commands registrados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao registrar commands:', error);
  }
}

// Buscar usuário pelo ID
async function findUserById(userId) {
  try {
    if (!db) throw new Error('Database not connected');
    const usersCollection = db.collection('Users');
    const user = await usersCollection.findOne({ id: userId });
    return user;
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error);
    return null;
  }
}

// Buscar usuário pelo username
async function findUserByUsername(username) {
  try {
    if (!db) throw new Error('Database not connected');
    const usersCollection = db.collection('Users');
    const user = await usersCollection.findOne({ username: username });
    return user;
  } catch (error) {
    console.error('Erro ao buscar usuário por username:', error);
    return null;
  }
}

// Atualizar username
async function updateUsername(userId, newUsername) {
  try {
    if (!db) throw new Error('Database not connected');
    const usersCollection = db.collection('Users');
    const result = await usersCollection.updateOne(
      { id: userId },
      { $set: { username: newUsername } }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Erro ao atualizar username:', error);
    return false;
  }
}

// Evento: Bot pronto
client.on('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  await registerCommands();
});

// Evento: Interação (slash commands)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'setusername') {
    const subcommand = options.getSubcommand();

    try {
      if (subcommand === 'id') {
        const userId = options.getString('user_id');
        const newUsername = options.getString('novo_username');

        // Buscar usuário pelo ID
        const user = await findUserById(userId);

        if (!user) {
          const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erro')
            .setDescription(`Usuário com ID \`${userId}\` não encontrado no MongoDB`);
          
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Atualizar username
        const updated = await updateUsername(userId, newUsername);

        if (updated) {
          const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Username Atualizado')
            .addFields(
              { name: 'ID do Usuário', value: userId, inline: true },
              { name: 'Username Anterior', value: user.username || 'N/A', inline: true },
              { name: 'Novo Username', value: newUsername, inline: true }
            );
          
          return interaction.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erro')
            .setDescription('Não foi possível atualizar o username');
          
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

      } else if (subcommand === 'username') {
        const currentUsername = options.getString('username_atual');
        const newUsername = options.getString('novo_username');

        // Buscar usuário pelo username
        const user = await findUserByUsername(currentUsername);

        if (!user) {
          const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erro')
            .setDescription(`Usuário com username \`${currentUsername}\` não encontrado no MongoDB`);
          
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Atualizar username
        const updated = await updateUsername(user.id, newUsername);

        if (updated) {
          const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Username Atualizado')
            .addFields(
              { name: 'ID do Usuário', value: user.id, inline: true },
              { name: 'Username Anterior', value: currentUsername, inline: true },
              { name: 'Novo Username', value: newUsername, inline: true }
            );
          
          return interaction.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erro')
            .setDescription('Não foi possível atualizar o username');
          
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }

    } catch (error) {
      console.error('Erro ao processar comando:', error);
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Erro')
        .setDescription('Ocorreu um erro ao processar o comando');
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
});

// Conectar ao MongoDB e iniciar bot
connectMongoDB().then(() => {
  client.login(process.env.DISCORD_TOKEN);
});
