## Changelog

### 2.2.3
- [Fixed] "Route not public" error after reconnecting.
- [Fixed] List of events now are updated when related settings are changed.
- [Fixed] Event texts are showed accordingly to the selected language.
- [Fixed] Filtered events don't show anymore on initialization.
- [Changed] Preset infomations are now more easy to understand.

### 2.2.2
- [Fixed] Tools inilize normally when the presetName settings is empty.

### 2.2.1
- [Changed] Inputs and selects now have the text centralized.
- [Changed] New logo added
- [Changed] The groups are now stored by ID instead of names.
- [Changed] Disabled option os settings are now different from "Disabled" named groups.
- [Fixed] Registers date are now calculated by the date/time of game instead of local PC.
- [Fixed] Account's presets not beeing showed on settings when none is set.
- [Fixed] Breaking line in dates on registers tab.
- [Fixed] The duration of attacks in player targets don't exceed the limit time.
- [Fixed] Date on remote status is now formatted.
- [Fixed] Nameless presets (Desc. only) are not showed anymore on settings.
- [Fixed] The tool can be initialized only one time.
- [Fixed] Translations/labels.
- [Fixed] Internal errors.

## 2.1.2 29/04/2017
- [Change] Limite de distância máxima dos alvos aumentado para 60.
- [Fix] Erro ao fazer leitura de relatórios de ataque sem capacidade farm.
- [Fix] Correção de traduções/esclarecimento de informações.
- [Fix] Erro ao atualizar predefinições do jogo e não ser atualizado na lista tela de configurações.

## 2.1.1 28/04/2017
- [New] Opções para alterar teclas atalho
- [Fix] Correção da sincronização dos comandos locais/server
- [Fix] Limite de tamanho do assunto da mensagem (Controle Remoto)
- [Fix] Traduções/informações

## 2.1.0 27/04/2017
- [New] Sistema para controlar o script remotamente via mensagens
- [New] Várias filtros de eventos nas cofigurações.

## 2.0.0 25/04/2017

- [New] Contagem de tropas por aldeias são feitas localmente, reduzindo consumo de banda com o servidor.
- [Fix] Contagem de comandos localmente agora funciona adequadamente e em harmania com a contagem de tropas local.
- [New] Sistema para priorizar alvos que tiveram o último saque lotado.
- [New] Lista de eventos não somem depois de executar o script novamente.
- [New] Arte do script adicionada na aba de informações.
- [Fix] Horário do último ataque mostrado no icone é atualizado em tempo real e não só quando é passado o mouse em cima.
- [Fix] Evento ao ignorar uma aldeia é mostrado apropriadamente.
- [Fix] Quando grupos de aldeias são alterados, o farm volta a ativa imadiatamente caso algum aldeia fique disponível.
- [Fix] Correções de traduções/textos.

## 1.3.3 18/04/2017

- [New] Opção para filtrar aldeias por pontuação
- [Change] Dados de comandos das aldeias agora são manuseados "localmente" e não é preciso carregar do servidor a cada ataque enviado.
- [Fix] Aviso "Sem predefinições" não é mais mostrado ao altera-los com o farm parado.
- [Fix] Erro ao adicionar grupos em aldeias quando não havia nenhum configurado no script.
- [Fix] Erro que parava o farm ao tentar atacar aldeias protegidas (incluidas por grupo).
- [Fix] Status "Limite de comandos" não é mais mostrado no lugar de "Sem tropas sulficientes".
- [Fix] Corrigindo algumas simualações de ações humanas.
- [Fix] Alinhamento de icones na interface.

## 1.3.2 15/04/2017

- [New] Agora é possível adicionar descrições no título das predefinições e serem identificados como um.
- [Fix] Problema ao iniciar quando a conta não possuia nenhum preset ativado nas aldeias.
- [Change] Configurações agora são separadas por categoria.
- [Change] É mostrado um status na aba Eventos quando o script esta processando os dados das aldeias.

## 1.3.1 14/04/2017

- [Fix] Erro ao tentar fazer leitura de relatórios que não sejam de ataque.

## 1.3.0 14/04/2017

- [New] Opção para adicionar alvos que causarem perdas na lista de ignorados.
- [New] Icones adicionados em algumas configurações.
- [Change] Predefinições são enviadas no lugar de "Exército Personalizado"
- [Change] Dados do mapa agora são carregados usando o sistema de mapa nativo do jogo.
- [Fix] Erro no sistema para manter o script em funcionando quando o jogador tinha apenas uma aldeia.


## 1.2.0 12/04/2017

- [Fix] Animação do icone corrigida.
- [Fix] Aldeias de jogadores incluidas agora tem o tempo máximo de viagem calculadas corretamente.
- [Fix] Erro "Sem tropas sulficientes" arrumado.

## 1.1.0rc 10/04/2017

- [New] Script verifica a cada minuto se os ataques estão em funcionamento.
- [New] Ataques continuam a partir dos mesmos alvos do último funcionamento do script. Exceto se um tempo de 30 minutos sem execução irá resetar de os índices na próxima execução de qualquer maneira.
- [New] Informações do último ataque agora são mostrados ao passar o mouse no botão de abrir a interface.
- [New] Botão de abrir interface agora fica vermelho quando o farm está ativado.
- [Fix] Aldeias adicionadas na lista de incluidas agora tem efeito imediato (não precisa reiniciar o script).
- [Change] Estilo dos elementos `<select>` melhorados.

## 1.0.1rc 09/04/2017

- [New] Script agora pode ser executado antes do jogo carregar completamente.
- [Fix] Lista de traduções não aparecia na primeira execução do script.

## 1.0.0rc 08/04/2017

- [New] Opção para alterar linguagem da interface.
- [New] Opção para atacar apenas com aldeias com um grupo específico.
- [Fix] Todos presets eram selecionados quando nenhum estava especificado nas configurações.

## 0.11.0beta 08/04/2017

- [New] Opção para incluir alvos de jogadores a partir de grupos.
- [Fix] Problema com funcionamento continuo arrumado.
- [Change] Melhoras na interface.

## 0.10.3 08/04/2017

- [New] Último ataque agora é salvo localmente, mostrando em futuras execuções do script.
- [Change] Interface aperfeiçoada.
- [Fix] Erro ao selecionar aldeias especificas quando o script é executado com múltiplas aldeias.

## 0.10.2 07/04/2017

- [New] Esquema para manter o script rodando mesmo após ocorrer erros internos no jogo.
- [New] Ataque para abrir janela do script e inicar. (Z & Shift+Z)
- [Fix] Janela do script agora se comporta como as outras janelas do jogo.
- [Fix] Notificações de inicio/pausa não apareciam algumas vezes.
- [Fix] Alguns eventos só faziam sentido para jogadores que possuiam mais de uma aldeia.

## 0.10.1 - 04/04/2017

- [Fix] Base aleatória calculando fora do normal.
- [Fix] Aldeias fora do limite de tempo causavam problemas na continuação dos ataques.

## 0.10.0 - 03/04/2017

- [New] Deixando os ataques automáticos similiares aos ataques manuais.
- [New] Simulando algumas açãos antes de cada ataque para simular uma pessoa enviando os ataques manualmente.
- [New] Configuração de distância mínima (campos) adicionada.
- [Fix] Ataques não param quando uma aldeia é adicionada a lista de ignoradas logo antes de enviar um ataque com ela.
- [Change] Configuração "Intervalo" alterada para "Intervalo aleatório" para evitar detecção de bot através de padrões repetitivos.
- [Change] Agora é possível selecionar a predefinição/grupo a partir de uma lista ao invés de adicionar o nome manualmente.

## 0.9.0 - 01/04/2017

- [New] Algumas informações são mostradas no topo da aba Eventos (Aldeia atual, último ataque, etc...).
- [New] Botões das aldeias nos eventos mostram as coordenadas.

## 0.8.1 - 31/03/2017

- [New] Informações sobre as configurações do script são mostradas na aba "Informações".

## 0.8.0 - 31/03/2017

- [New] Nova configuração, tempo máximo de viagem dos ataques.
