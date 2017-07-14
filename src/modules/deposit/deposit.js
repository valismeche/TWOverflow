define('TWOverflow/autoDeposit', [
    'helper/time'
], function ($timeHelper) {
    /**
     * Indica se o modulo já foi iniciado.
     *
     * @type {Boolean}
     */
    var initialized = false

    /**
     * Indica se o modulo está em funcionamento.
     *
     * @type {Boolean}
     */
    var running = false

    /**
     * ID do timeout usado no intervalo entre cada checagem.
     * Necessário para quando o modulo for parado, não haver
     * mais execuções.
     *
     * @type {Number|Null}
     */
    var loopTimeoutId = null

    /**
     * Guarda o timestamp da próxima vez que os trabalhos do depósitos
     * serão resetados.
     * Usado para forçar os dados a serem atualizados pois o
     * jogo só faz isso quando o deposito é aberto manualmente.
     *
     * @type {Number|Null}
     */
    var nextReset = null

    /**
     * Métodos públicos do deposito, usado para atualizar os dados
     * assim que carregados.
     *
     * @type {Object}
     */
    var depositService = injector.get('resourceDepositService')

    /**
     * Faz a analise dos trabalhos periódicamente.
     */
    var analyseJobs = function () {
        var jobs = getJobData()

        if (nextReset - $timeHelper.gameTime() < 0) {
            return updateInfo(analyseJobs)
        }

        if (hasRunningJob(jobs)) {
            return
        }

        if (hasCollectibleJob(jobs)) {
            var job = getCollectibleJob(jobs)

            return collectJob(job)
        }

        if (hasReadyJob(jobs)) {
            var job = getReadyJob(jobs)

            return startJob(job)
        }
    }

    /**
     * Obtem os dados dos trabalhos.
     *
     * @return {Array}
     */
    var getJobData = function () {
        return $model.getSelectedCharacter().getResourceDeposit().getJobs()
    }

    /**
     * Verifica se há trabalhos prontos para serem coletados.
     *
     * @param {Object} jobs - Lista de trabalhos disponíveis.
     * @return {Boolean}
     */
    var hasCollectibleJob = function (jobs) {
        for (var id in jobs) {
            if (jobs[id].state === 1) {
                return true
            }
        }

        return false
    }

    /**
     * Obtem o trabalho que pode ser coletado.
     *
     * @param {Object} jobs - Lista de trabalhos disponíveis.
     * @return {Object|Boolean}
     */
    var getCollectibleJob = function (jobs) {
        for (var id in jobs) {
            if (jobs[id].state === 1) {
                return jobs[id]
            }
        }

        return false
    }

    /**
     * Verifica se há algum trabalho em andamento.
     *
     * @param {Object} jobs - Lista de trabalhos disponíveis.
     * @return {Boolean}
     */
    var hasRunningJob = function (jobs) {
        for (var id in jobs) {
            if (jobs[id].state === 0) {
                return true
            }
        }

        return false
    }

    /**
     * Verifica se tem trabalhos disponíveis para serem iniciados.
     *
     * @param {Object} jobs - Lista de trabalhos disponíveis.
     * @return {Boolean}
     */
    var hasReadyJob = function (jobs) {
        for (var id in jobs) {
            if (jobs[id].state === 2) {
                return true
            }
        }

        return false
    }

    /**
     * Obtem um dos trabalhos prontos para serem iniciados.
     *
     * @param {Object} jobs - Lista de trabalhos disponíveis.
     * @return {Object|Boolean}
     */
    var getReadyJob = function (jobs) {
        for (var id in jobs) {
            if (jobs[id].state === 2) {
                return jobs[id]
            }
        }

        return false
    }

    /**
     * Coleta um trabalho
     *
     * @param {Object} job - Dados do trabalho
     */
    var collectJob = function (job) {
        $socket.emit($route.RESOURCE_DEPOSIT_COLLECT, {
            job_id: job.id,
            village_id: $model.getSelectedVillage().getId()
        })
    }

    /**
     * Inicia um trabalho
     *
     * @param {Object} job - Dados do trabalho
     */
    var startJob = function (job) {
        $socket.emit($route.RESOURCE_DEPOSIT_START_JOB, {
            job_id: job.id
        })
    }

    /**
     * Atualiza os dados dos trabalhos.
     *
     * @param {Function=} _callback
     */
    var updateInfo = function (_callback) {
        $socket.emit($route.RESOURCE_DEPOSIT_GET_INFO, {}, function (data) {
            depositService.updateJobData(data.jobs)

            nextReset = data.time_next_reset * 1000

            if (_callback) {
                _callback()
            }
        })
    }

    /**
     * Métodos públicos do AutoDeposit.
     *
     * @type {Object}
     */
    var autoDeposit = {}

    /**
     * Inicializa o AutoDepois, configura os eventos.
     */
    autoDeposit.init = function () {
        initialized = true

        $root.$on($eventType.RESOURCE_DEPOSIT_JOB_COLLECTED, analyseJobs)
        $root.$on($eventType.RESOURCE_DEPOSIT_JOBS_REROLLED, analyseJobs)

        // Não podemos utilizar RESOURCE_DEPOSIT_JOB_COLLECTIBLE por que é chamado
        // múltiplas vezes em seguida e acaba fodendo com o script.

        // $root.$on($eventType.RESOURCE_DEPOSIT_JOB_COLLECTIBLE, analyseJobs)
    }

    /**
     * Inicia a analise dos trabalhos.
     */
    autoDeposit.start = function () {
        running = true
        loopTimeoutId = setInterval(analyseJobs, 60000)

        updateInfo(function () {
            analyseJobs()
        })
    }

    /**
     * Para a analise dos trabalhos.
     */
    autoDeposit.stop = function () {
        running = false
        clearInterval(loopTimeoutId)
    }

    /**
     * Retorna se o modulo está em funcionamento.
     */
    autoDeposit.isRunning = function () {
        return running
    }

    /**
     * Retorna se o modulo está inicializado.
     */
    autoDeposit.isInitialized = function () {
        return initialized
    }

    return autoDeposit
})
