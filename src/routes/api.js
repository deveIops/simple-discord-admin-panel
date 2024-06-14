const express = require('express');
const axios = require('axios');
const router = express.Router();

let botToken = null;
let webSocketClients = [];

// Route pour récupérer les informations du bot Discord
router.post('/connect', async (req, res) => {
  const { token } = req.body;

  try {
    const response = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${token}`
      }
    });

    botToken = token; // Enregistrer le token globalement pour une utilisation ultérieure

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching bot info:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Invalid token' });
  }
});

// Route pour obtenir les utilisateurs
router.get('/users', async (req, res) => {
  try {
    const guildsResponse = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bot ${botToken}`
      }
    });

    const guilds = guildsResponse.data;
    const users = [];

    for (const guild of guilds) {
      const membersResponse = await axios.get(`https://discord.com/api/v10/guilds/${guild.id}/members`, {
        headers: {
          Authorization: `Bot ${botToken}`
        },
        params: {
          limit: 1000 // Adjust the limit as needed
        }
      });

      membersResponse.data.forEach(member => {
        member.guild_id = guild.id;
        member.guild_name = guild.name;
      });

      users.push(...membersResponse.data);
    }

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error fetching users' });
  }
});

// Route pour obtenir les rôles
router.get('/roles', async (req, res) => {
  try {
    const guildsResponse = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bot ${botToken}`
      }
    });

    const guilds = guildsResponse.data;
    const roles = [];

    for (const guild of guilds) {
      const rolesResponse = await axios.get(`https://discord.com/api/v10/guilds/${guild.id}/roles`, {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      });

      rolesResponse.data.forEach(role => {
        role.guild_id = guild.id;
        role.guild_name = guild.name;
      });

      roles.push(...rolesResponse.data);
    }

    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error fetching roles' });
  }
});

// Route pour obtenir les serveurs
router.get('/servers', async (req, res) => {
  try {
    const response = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bot ${botToken}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching servers:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error fetching servers' });
  }
});

// Route pour bannir un utilisateur
router.post('/ban', async (req, res) => {
  const { token, guildId, userId } = req.body;

  try {
    await axios.put(`https://discord.com/api/v10/guilds/${guildId}/bans/${userId}`, {}, {
      headers: {
        Authorization: `Bot ${token}`
      }
    });

    res.status(200).json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('Error banning user:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error banning user' });
  }
});

// Route pour expulser un utilisateur
router.post('/kick', async (req, res) => {
  const { token, guildId, userId } = req.body;

  try {
    await axios.delete(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: {
        Authorization: `Bot ${token}`
      }
    });

    res.status(200).json({ message: 'User kicked successfully' });
  } catch (error) {
    console.error('Error kicking user:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error kicking user' });
  }
});

// Route pour renommer un utilisateur
router.post('/rename', async (req, res) => {
  const { token, guildId, userId, newName } = req.body;

  try {
    await axios.patch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      nick: newName
    }, {
      headers: {
        Authorization: `Bot ${token}`
      }
    });

    res.status(200).json({ message: 'User renamed successfully' });
  } catch (error) {
    console.error('Error renaming user:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error renaming user' });
  }
});

// Route pour quitter un serveur
router.post('/leave', async (req, res) => {
  const { token, guildId } = req.body;

  try {
    await axios.delete(`https://discord.com/api/v10/users/@me/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${token}`
      }
    });

    res.status(200).json({ message: 'Bot left the server' });
  } catch (error) {
    console.error('Error leaving server:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error leaving server' });
  }
});

// Route pour envoyer un message direct à tous les membres du serveur
router.post('/dmall', async (req, res) => {
  const { token, guildId, message } = req.body;

  try {
    const membersResponse = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/members`, {
      headers: {
        Authorization: `Bot ${token}`
      },
      params: {
        limit: 1000
      }
    });

    const members = membersResponse.data;
    for (const member of members) {
      try {
        const dmChannelResponse = await axios.post('https://discord.com/api/v10/users/@me/channels', {
          recipient_id: member.user.id
        }, {
          headers: {
            Authorization: `Bot ${token}`
          }
        });

        const dmChannelId = dmChannelResponse.data.id;
        await axios.post(`https://discord.com/api/v10/channels/${dmChannelId}/messages`, {
          content: message
        }, {
          headers: {
            Authorization: `Bot ${token}`
          }
        });

        broadcastDmStatus(`Message sent to ${member.user.username}#${member.user.discriminator}`, 'success');
      } catch (error) {
        broadcastDmStatus(`Failed to send message to ${member.user.username}#${member.user.discriminator}`, 'error');
        console.error(`Error sending message to ${member.user.username}#${member.user.discriminator}:`, error.response ? error.response.data : error.message);
      }
    }

    res.status(200).json({ message: 'Messages sent' });
  } catch (error) {
    console.error('Error sending messages:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error sending messages' });
  }
});

// Route pour supprimer un rôle
router.post('/role/delete', async (req, res) => {
  const { token, guildId, roleId } = req.body;

  try {
    await axios.delete(`https://discord.com/api/v10/guilds/${guildId}/roles/${roleId}`, {
      headers: {
        Authorization: `Bot ${token}`
      }
    });

    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error deleting role' });
  }
});

// Route pour renommer un rôle
router.post('/role/rename', async (req, res) => {
  const { token, guildId, roleId, newName } = req.body;

  try {
    await axios.patch(`https://discord.com/api/v10/guilds/${guildId}/roles/${roleId}`, {
      name: newName
    }, {
      headers: {
        Authorization: `Bot ${token}`
      }
    });

    res.status(200).json({ message: 'Role renamed successfully' });
  } catch (error) {
    console.error('Error renaming role:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error renaming role' });
  }
});

// Diffuser le statut de DMALL
function broadcastDmStatus(message, status) {
  const data = JSON.stringify({ type: 'dmall-status', message, status });
  webSocketClients.forEach(client => client.send(data));
}

// Ajouter un support pour les WebSockets dans l'application principale
function setupWebSocket(server) {
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    webSocketClients.push(ws);

    ws.on('close', () => {
      webSocketClients = webSocketClients.filter(client => client !== ws);
    });
  });
}


router.get('/info', async (req, res) => {
  try {
    const botInfoResponse = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${botToken}`
      }
    });

    const guildsResponse = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bot ${botToken}`
      }
    });

    const guilds = guildsResponse.data;
    let memberCount = 0;

    for (const guild of guilds) {
      const guildMembersResponse = await axios.get(`https://discord.com/api/v10/guilds/${guild.id}/members`, {
        headers: {
          Authorization: `Bot ${botToken}`
        },
        params: {
          limit: 1000
        }
      });

      memberCount += guildMembersResponse.data.length;
    }

    const botInfo = botInfoResponse.data;
    botInfo.guilds = guilds.length;
    botInfo.members = memberCount;

    res.json(botInfo);
  } catch (error) {
    console.error('Error fetching bot information:', error.response ? error.response.data : error.message);
    res.status(400).json({ message: 'Error fetching bot information' });
  }
});


module.exports = { router, setupWebSocket };
