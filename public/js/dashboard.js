document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.section');
  const menuItems = document.querySelectorAll('.menu-item');
  const popup = document.getElementById('popup');
  const popupContent = document.getElementById('popup-content');
  const dmallStatus = document.getElementById('dmall-status');
  
  let currentAction = null;
  let currentServer = null;
  let currentUser = null;
  let currentRole = null;

  let usersData = null;
  let rolesData = null;
  let serversData = null;

  document.getElementById('connect-form').addEventListener('submit', event => {
    event.preventDefault();
    const token = document.getElementById('token').value;
    connectBot(token);
  });

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const section = document.getElementById(item.getAttribute('data-section'));
      sections.forEach(sec => sec.classList.remove('active'));
      section.classList.add('active');
      
      // Charger les données en fonction de la section
      if (item.getAttribute('data-section') === 'users') {
        if (!usersData) {
          fetchUsers();
        } else {
          displayUsers(usersData);
        }
      } else if (item.getAttribute('data-section') === 'roles') {
        if (!rolesData) {
          fetchRoles();
        } else {
          displayRoles(rolesData);
        }
      } else if (item.getAttribute('data-section') === 'servers') {
        if (!serversData) {
          fetchServers();
        } else {
          displayServers(serversData);
        }
      } else if (item.getAttribute('data-section') === 'logs') {
        fetchLogs();
      }
    });
  });

  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('discordBotToken'); 
    window.location.href = '/'; 
  });

  function connectBot(token) {
    fetch('/api/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Invalid token') {
        alert('Jeton invalide. Veuillez réessayer.');
      } else {
        localStorage.setItem('discordBotToken', token);
        alert(`Connecté en tant que ${data.username}#${data.discriminator}`);
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('dashboard-container').style.display = 'flex';
        setupWebSocket(token);
      }
    })
    .catch(error => console.error('Erreur de connexion du bot:', error));
  }

  function setupWebSocket(token) {
    const socket = new WebSocket(`ws://${window.location.host}/ws?token=${token}`);
    socket.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (data.type === 'dmall-status') {
        updateDmAllStatus(data.message, data.status);
      }
    });
  }

  function updateDmAllStatus(message, status) {
    const statusLine = document.createElement('div');
    statusLine.classList.add('status-line', status);
    statusLine.textContent = message;
    dmallStatus.appendChild(statusLine);
    dmallStatus.scrollTop = dmallStatus.scrollHeight; // Scroll to the bottom
  }

  function fetchWithRetry(url, options, maxRetries = 3) {
    return fetch(url, options)
      .then(response => response.json())
      .then(data => {
        if (data.message && data.message.includes('rate limited')) {
          const retryAfter = data.retry_after * 1000;
          console.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
          return new Promise((resolve) => setTimeout(resolve, retryAfter))
            .then(() => fetchWithRetry(url, options, maxRetries - 1));
        }
        return data;
      });
  }

  function fetchUsers() {
    const token = localStorage.getItem('discordBotToken');
    fetchWithRetry('/api/users', {
      headers: {
        Authorization: `Bot ${token}`
      }
    })
    .then(data => {
      usersData = data;
      displayUsers(usersData);
    })
    .catch(error => console.error('Erreur lors de la récupération des utilisateurs:', error));
  }

  function displayUsers(data) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    const servers = {};

    data.forEach(member => {
      const guildId = member.guild_id;
      if (!servers[guildId]) {
        servers[guildId] = {
          name: member.guild_name,
          members: []
        };
      }
      servers[guildId].members.push(member);
    });

    for (const guildId in servers) {
      const server = servers[guildId];
      const serverSection = document.createElement('div');
      serverSection.classList.add('server-section');

      const serverTitle = document.createElement('h3');
      serverTitle.classList.add('server-title');
      serverTitle.textContent = server.name;
      serverTitle.addEventListener('click', () => {
        serverContent.classList.toggle('active');
      });

      const serverContent = document.createElement('div');
      serverContent.classList.add('server-content');

      const searchBar = document.createElement('div');
      searchBar.classList.add('search-bar');
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Rechercher un utilisateur';
      searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        serverContent.querySelectorAll('.item-card').forEach(card => {
          const username = card.textContent.toLowerCase();
          if (username.includes(searchTerm)) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });

      searchBar.appendChild(searchInput);
      serverContent.appendChild(searchBar);

      server.members.forEach(member => {
        const userDiv = document.createElement('div');
        userDiv.classList.add('item-card');
        userDiv.textContent = `${member.user.username}#${member.user.discriminator}`;

        const actionButtons = document.createElement('div');
        actionButtons.classList.add('action-buttons');

        const banButton = document.createElement('button');
        banButton.classList.add('ban-button');
        banButton.textContent = 'Bannir';
        banButton.addEventListener('click', () => showPopup('ban', member));

        const kickButton = document.createElement('button');
        kickButton.classList.add('kick-button');
        kickButton.textContent = 'Expulser';
        kickButton.addEventListener('click', () => showPopup('kick', member));

        const renameButton = document.createElement('button');
        renameButton.classList.add('rename-button');
        renameButton.textContent = 'Renommer';
        renameButton.addEventListener('click', () => showPopup('rename', member));

        actionButtons.appendChild(banButton);
        actionButtons.appendChild(kickButton);
        actionButtons.appendChild(renameButton);

        userDiv.appendChild(actionButtons);
        serverContent.appendChild(userDiv);
      });

      serverSection.appendChild(serverTitle);
      serverSection.appendChild(serverContent);
      usersList.appendChild(serverSection);
    }
  }

  function fetchRoles() {
    const token = localStorage.getItem('discordBotToken');
    fetchWithRetry('/api/roles', {
      headers: {
        Authorization: `Bot ${token}`
      }
    })
    .then(data => {
      rolesData = data;
      displayRoles(rolesData);
    })
    .catch(error => console.error('Erreur lors de la récupération des rôles:', error));
  }

  function displayRoles(data) {
    const rolesList = document.getElementById('roles-list');
    rolesList.innerHTML = '';
    const servers = {};

    data.forEach(role => {
      const guildId = role.guild_id;
      if (!servers[guildId]) {
        servers[guildId] = {
          name: role.guild_name,
          roles: []
        };
      }
      servers[guildId].roles.push(role);
    });

    for (const guildId in servers) {
      const server = servers[guildId];
      const serverSection = document.createElement('div');
      serverSection.classList.add('server-section');

      const serverTitle = document.createElement('h3');
      serverTitle.classList.add('server-title');
      serverTitle.textContent = server.name;
      serverTitle.addEventListener('click', () => {
        serverContent.classList.toggle('active');
      });

      const serverContent = document.createElement('div');
      serverContent.classList.add('server-content');

      const searchBar = document.createElement('div');
      searchBar.classList.add('search-bar');
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Rechercher un rôle';
      searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        serverContent.querySelectorAll('.item-card').forEach(card => {
          const roleName = card.textContent.toLowerCase();
          if (roleName.includes(searchTerm)) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });

      searchBar.appendChild(searchInput);
      serverContent.appendChild(searchBar);

      server.roles.forEach(role => {
        const roleDiv = document.createElement('div');
        roleDiv.classList.add('item-card');
        roleDiv.textContent = role.name;

        const actionButtons = document.createElement('div');
        actionButtons.classList.add('action-buttons');

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = 'Supprimer';
        deleteButton.addEventListener('click', () => showPopup('deleteRole', role));

        const renameButton = document.createElement('button');
        renameButton.classList.add('rename-button');
        renameButton.textContent = 'Renommer';
        renameButton.addEventListener('click', () => showPopup('renameRole', role));

        actionButtons.appendChild(deleteButton);
        actionButtons.appendChild(renameButton);

        roleDiv.appendChild(actionButtons);
        serverContent.appendChild(roleDiv);
      });

      serverSection.appendChild(serverTitle);
      serverSection.appendChild(serverContent);
      rolesList.appendChild(serverSection);
    }
  }

  function fetchServers() {
    const token = localStorage.getItem('discordBotToken');
    fetchWithRetry('/api/servers', {
      headers: {
        Authorization: `Bot ${token}`
      }
    })
    .then(data => {
      serversData = data;
      displayServers(serversData);
    })
    .catch(error => console.error('Erreur lors de la récupération des serveurs:', error));
  }

  function displayServers(data) {
    const serversList = document.getElementById('servers-list');
    serversList.innerHTML = '';
    data.forEach(server => {
      const serverDiv = document.createElement('div');
      serverDiv.classList.add('item-card');
      serverDiv.textContent = server.name;

      const actionButtons = document.createElement('div');
      actionButtons.classList.add('action-buttons');

      const leaveButton = document.createElement('button');
      leaveButton.classList.add('leave-button');
      leaveButton.textContent = 'Quitter';
      leaveButton.addEventListener('click', () => showPopup('leave', server));

      const dmallButton = document.createElement('button');
      dmallButton.classList.add('dmall-button');
      dmallButton.textContent = 'DmAll';
      dmallButton.addEventListener('click', () => showPopup('dmall', server));

      actionButtons.appendChild(leaveButton);
      actionButtons.appendChild(dmallButton);
      serverDiv.appendChild(actionButtons);
      serversList.appendChild(serverDiv);
    });
  }

  function fetchLogs() {
    const token = localStorage.getItem('discordBotToken');
    fetchWithRetry('/api/servers', {
      headers: {
        Authorization: `Bot ${token}`
      }
    })
    .then(data => {
      displayLogServers(data);
    })
    .catch(error => console.error('Erreur lors de la récupération des logs:', error));
  }

  function displayLogServers(servers) {
    const logsList = document.getElementById('logs-list');
    logsList.innerHTML = '';
    servers.forEach(server => {
      const serverDiv = document.createElement('div');
      serverDiv.classList.add('item-card');
      serverDiv.textContent = server.name;
      serverDiv.addEventListener('click', () => fetchLogDetails(server.id, server.name));
      logsList.appendChild(serverDiv);
    });
  }

  function fetchLogDetails(serverId, serverName) {
    const token = localStorage.getItem('discordBotToken');
    fetchWithRetry(`/api/logs/${serverId}`, {
      headers: {
        Authorization: `Bot ${token}`
      }
    })
    .then(data => {
      displayLogDetails(serverName, data);
    })
    .catch(error => console.error('Erreur lors de la récupération des détails des logs:', error));
  }

  function displayLogDetails(serverName, logs) {
    const logDetails = document.getElementById('log-details');
    const logEntries = document.getElementById('log-entries');
    document.getElementById('server-name').textContent = serverName;
    logEntries.innerHTML = '';
    logs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.classList.add('log-entry');
      logEntry.textContent = `${log.timestamp}: ${log.message}`;
      logEntries.appendChild(logEntry);
    });
    logDetails.style.display = 'block';
  }

  function showPopup(action, item) {
    currentAction = action;
    currentUser = action === 'rename' || action === 'ban' || action === 'kick' ? item : null;
    currentServer = action === 'leave' || action === 'dmall' ? item : null;
    currentRole = action === 'deleteRole' || action === 'renameRole' ? item : null;

    popupContent.innerHTML = '';
    const popupTitle = document.createElement('h3');
    popupContent.appendChild(popupTitle);

    if (action === 'rename') {
      popupTitle.textContent = `Renommer ${item.user.username}#${item.user.discriminator}`;
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'new-name';
      input.placeholder = 'Nouveau nom';
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Confirmer';
      const resetButton = document.createElement('button');
      resetButton.id = 'reset';
      resetButton.classList.add('reset');
      resetButton.textContent = 'Réinitialiser le pseudo';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Annuler';

      confirmButton.addEventListener('click', () => renameUser(currentUser, document.getElementById('new-name').value));
      resetButton.addEventListener('click', () => resetUserName(currentUser));
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(input);
      popupContent.appendChild(confirmButton);
      popupContent.appendChild(resetButton);
      popupContent.appendChild(cancelButton);
    } else if (action === 'leave') {
      popupTitle.textContent = `Voulez-vous vraiment quitter le serveur ${item.name} ?`;
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Oui';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Non';

      confirmButton.addEventListener('click', confirmAction);
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(confirmButton);
      popupContent.appendChild(cancelButton);
    } else if (action === 'dmall') {
      popupTitle.textContent = `Envoyer un message à tous les membres du serveur ${item.name}`;
      const textarea = document.createElement('textarea');
      textarea.id = 'dm-message';
      textarea.placeholder = 'Votre message';
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Envoyer';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Annuler';

      confirmButton.addEventListener('click', () => sendDmToAll(item, document.getElementById('dm-message').value));
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(textarea);
      popupContent.appendChild(confirmButton);
      popupContent.appendChild(cancelButton);
    } else if (action === 'ban' || action === 'kick') {
      const actionText = action === 'ban' ? 'bannir' : 'expulser';
      popupTitle.textContent = `Voulez-vous vraiment ${actionText} ${item.user.username}#${item.user.discriminator} ?`;
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Oui';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Non';

      confirmButton.addEventListener('click', confirmAction);
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(confirmButton);
      popupContent.appendChild(cancelButton);
    } else if (action === 'deleteRole') {
      popupTitle.textContent = `Voulez-vous vraiment supprimer le rôle ${item.name} ?`;
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Oui';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Non';

      confirmButton.addEventListener('click', () => deleteRole(currentRole));
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(confirmButton);
      popupContent.appendChild(cancelButton);
    } else if (action === 'renameRole') {
      popupTitle.textContent = `Renommer le rôle ${item.name}`;
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'new-role-name';
      input.placeholder = 'Nouveau nom du rôle';
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Confirmer';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Annuler';

      confirmButton.addEventListener('click', () => renameRole(currentRole, document.getElementById('new-role-name').value));
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(input);
      popupContent.appendChild(confirmButton);
      popupContent.appendChild(cancelButton);
    }

    popup.classList.add('active');
  }

  function confirmAction() {
    if (currentAction && (currentUser || currentServer)) {
      const token = localStorage.getItem('discordBotToken');
      const actionEndpoint = currentAction === 'ban' ? '/api/ban' : currentAction === 'kick' ? '/api/kick' : currentAction === 'leave' ? '/api/leave' : null;
      const actionText = currentAction === 'ban' ? 'banni' : currentAction === 'kick' ? 'expulsé' : 'quitté';

      fetchWithRetry(actionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          guildId: currentUser ? currentUser.guild_id : currentServer.id,
          userId: currentUser ? currentUser.user.id : null
        })
      })
      .then(data => {
        if (data.message.includes('successfully')) {
          alert(`L'utilisateur ${currentUser.user.username}#${currentUser.user.discriminator} a été ${actionText}!`);
          if (currentAction === 'leave') fetchServers();
        } else {
          alert(`Échec de ${currentAction === 'ban' ? 'bannir' : 'expulser'} l'utilisateur ${currentUser.user.username}#${currentUser.user.discriminator}.`);
        }
      })
      .catch(error => console.error(`Erreur lors de l'action ${currentAction} sur l'utilisateur:`, error));
    }
    closePopup();
  }

  function renameUser(user, newName) {
    const token = localStorage.getItem('discordBotToken');
    fetchWithRetry('/api/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        guildId: user.guild_id,
        userId: user.user.id,
        newName: newName
      })
    })
    .then(data => {
      if (data.message === 'User renamed successfully') {
        alert(`L'utilisateur ${user.user.username}#${user.user.discriminator} a été renommé en ${newName}!`);
      } else {
        alert(`Échec du renommage de l'utilisateur ${user.user.username}#${user.user.discriminator}.`);
      }
    })
    .catch(error => console.error('Erreur lors du renommage de lutilisateur:', error));
    closePopup();
  }

  function resetUserName(user) {
    const token = localStorage.getItem('discordBotToken');
    fetchWithRetry('/api/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        guildId: user.guild_id,
        userId: user.user.id,
        newName: ''
      })
    })
    .then(data => {
      if (data.message === 'User renamed successfully') {
        alert(`Le pseudo de l'utilisateur ${user.user.username}#${user.user.discriminator} a été réinitialisé!`);
      } else {
        alert(`Échec de la réinitialisation du pseudo de l'utilisateur ${user.user.username}#${user.user.discriminator}.`);
      }
    })
    .catch(error => console.error('Erreur lors de la réinitialisation du pseudo:', error));
    closePopup();
  }

  function sendDmToAll(server, message) {
    checkPermissions(server, () => {
      const token = localStorage.getItem('discordBotToken');
      fetchWithRetry('/api/dmall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          guildId: server.id,
          message: message
        })
      })
      .then(data => {
        if (data.message === 'Messages sent') {
          alert(`Message envoyé à tous les membres de ${server.name}`);
          dmallStatus.innerHTML = '<h3>DMALL en cours...</h3>';
        } else if (data.code === 50001) {
          alert('Erreur: Accès manquant. Assurez-vous que le bot a les permissions nécessaires pour envoyer des messages.');
        } else {
          alert(`Échec de l'envoi des messages à tous les membres de ${server.name}`);
        }
      })
      .catch(error => console.error('Erreur lors de envoi des messages:', error));
      closePopup();
    });
  }

  function deleteRole(role) {
    const token = localStorage.getItem('discordBotToken');
    fetchWithRetry('/api/role/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        guildId: role.guild_id,
        roleId: role.id
      })
    })
    .then(data => {
      if (data.message === 'Role deleted successfully') {
        alert(`Le rôle ${role.name} a été supprimé!`);
        fetchRoles();
      } else {
        alert(`Échec de la suppression du rôle ${role.name}.`);
      }
    })
    .catch(error => console.error('Erreur lors de la suppression du rôle:', error));
    closePopup();
  }

  function renameRole(role, newName) {
    const token = localStorage.getItem('discordBotToken');
    fetchWithRetry('/api/role/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        guildId: role.guild_id,
        roleId: role.id,
        newName: newName
      })
    })
    .then(data => {
      if (data.message === 'Role renamed successfully') {
        alert(`Le rôle ${role.name} a été renommé en ${newName}!`);
        fetchRoles();
      } else {
        alert(`Échec du renommage du rôle ${role.name}.`);
      }
    })
    .catch(error => console.error('Erreur lors du renommage du rôle:', error));
    closePopup();
  }

  function closePopup() {
    popup.classList.remove('active');
  }

  function checkPermissions(server, callback) {
    const token = localStorage.getItem('discordBotToken');
    fetchWithRetry(`/api/check-permissions/${server.id}`, {
      headers: {
        Authorization: `Bot ${token}`
      }
    })
    .then(data => {
      if (data.hasPermission) {
        callback();
      } else {
        alert('Erreur: Accès manquant. Assurez-vous que le bot a les permissions nécessaires pour envoyer des messages.');
      }
    })
    .catch(error => console.error('Erreur lors de la vérification des permissions:', error));
  }
});

function fetchWithRetry(url, options, maxRetries = 3) {
  return fetch(url, options)
    .then(response => response.json())
    .then(data => {
      if (data.message && data.message.includes('rate limited')) {
        const retryAfter = data.retry_after * 1000;
        console.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
        return new Promise((resolve) => setTimeout(resolve, retryAfter))
          .then(() => fetchWithRetry(url, options, maxRetries - 1));
      }
      return data;
    });
}
