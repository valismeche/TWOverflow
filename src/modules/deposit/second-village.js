define('TWOverflow/autoDeposit/secondVillage', [
    'TWOverflow/autoDeposit',
    'helper/time'
], function (
    autoDeposit,
    $timeHelper
) {
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
     * Indica se a segunda aldeia está ativa no jogo (ou se já foi usada)
     *
     * @type {Boolean}
     */
    var active = false

    /**
     * Lista de trabalhos disponíveis na segunda aldeia.
     */
    var jobs

    /**
     * Dia atual da construção da segunda aldeia.
     * Cada dia é liberado um conjunto de edifícios.
     */
    var day

    /**
     * ID do timeout usado no intervalo entre cada checagem.
     * Necessário para quando o modulo for parado, não haver
     * mais execuções.
     *
     * @type {Number|Null}
     */
    var loopTimeoutId = null

    /**
     * Métodos públicos da segunda aldeia.
     *
     * @type {Object}
     */
    var secondVillageService = injector.get('secondVillageService')

    /**
     * Faz a analise dos trabalhos periódicamente.
     */
    var analyseJobs = function () {
        if (!running) {
            return false
        }

        var runningJob = hasRunningJob()

        if (runningJob) {
            setTimeout(function () {
                updateInfo()
            }, (runningJob.time_completed * 1000) - Date.now())

            return false
        }

        if (hasCollectibleJob()) {
            return collectJob()
        }

        // TODO
        // - Verificar se o trabalho tem os requerimentos cumpridos.
        // - Analisar se é preciso ter trabalhos requeridos (job.jobs_required)
        //    antes de iniciar um trabalho

        if (hasReadyJob()) {
            return startJob()
        }
    }

    /**
     * Verifica se tem algum trabalho em andamento.
     *
     * @return {Object|Boolean} Retorna o trabalho em andamento, ou
     *   false caso não haja algum.
     */
    var hasRunningJob = function () {
        var runningJob = secondVillageService.getJobInProgress(jobs)
        var collectedJobs = secondVillageService.getCollectedJobs(jobs)

        // caso já tenha sido coletado, indica que não há nenhum
        // trabalho em andamento.
        if (runningJob in collectedJobs) {
            return false
        }

        if (!(runningJob in jobs)) {
            return false
        }

        var complatedTime = jobs[runningJob].time_completed * 1000

        if ($timeHelper.gameTime() < complatedTime) {
            return jobs[runningJob]
        }

        return false
    }

    /**
     * Verifica se tem algum trabalho pronto e não coletado.
     *
     * @return {Boolean}
     */
    var hasCollectibleJob = function () {
        var runningJob = secondVillageService.getJobInProgress(jobs)
        var collectedJobs = secondVillageService.getCollectedJobs(jobs)

        if (!runningJob) {
            return false
        }

        return !hasRunningJob() && !(runningJob in collectedJobs)
    }

    /**
     * Coleta um trabalho finalizado.
     */
    var collectJob = function () {
        var collectibleJob = secondVillageService.getJobInProgress(jobs)

        $socket.emit($route.SECOND_VILLAGE_COLLECT_JOB_REWARD, {
            job_id: jobs[collectibleJob].id,
            village_id: $model.getSelectedVillage().getId()
        }, function () {
            updateInfo()
        })
    }

    /**
     * Verifica se tem algum trabalho que ainda não foi coletado
     * no fia atual.
     *
     * @return {Boolean}
     */
    var hasReadyJob = function () {
        var currentDayJobs = secondVillageService.getCurrentDayJobs(jobs, day)

        for (var id in currentDayJobs) {
            if (!currentDayJobs[id].collected) {
                return true
            }
        }

        return false
    }

    /**
     * Inicia algum dos trabalhos disponíveis.
     */
    var startJob = function () {
        var dayJobs = secondVillageService.getCurrentDayJobs(jobs, day)
        var job = getAvailJobToday(dayJobs)

        if (!job) {
            return false
        }

        $socket.emit($route.SECOND_VILLAGE_START_JOB, {
            job_id: job.id,
            village_id: $model.getSelectedVillage().getId()
        }, function () {
            // Atualiza os dados ao iniciar o trabalho.
            // Assim a próxima a verificação não tentará
            // iniciar o trabalho novamente.
            updateInfo()

            setTimeout(updateInfo, (job.duration * 1000) + 3000)
        })
    }

    /**
     * Obtem um dos trabalhos disponíveis para o dia atual.
     *
     * @return {Object|Boolean}
     */
    var getAvailJobToday = function () {
        var currentDayJobs = secondVillageService.getCurrentDayJobs(jobs, day)
        var collectedJobs = secondVillageService.getCollectedJobs(jobs)
        var resources = $model.getSelectedVillage().getResources().getResources()
        var availableJobs = secondVillageService.getAvailableJobs(currentDayJobs, collectedJobs, resources, [])

        for (var id in availableJobs) {
            return availableJobs[id]
        }

        return false
    }

    /**
     * Atualiza os dados dos trabalhos.
     *
     * @param {Function=} _callback
     */
    var updateInfo = function (_callback) {
        $socket.emit($route.SECOND_VILLAGE_GET_INFO, {}, function (data) {
            jobs = data.jobs
            day = data.day

            if (_callback) {
                _callback()
            }
        })
    }

    /**
     * Métodos públicos do AutoDeposit.secondVillage.
     *
     * @type {Object}
     */
    var secondVillage = {}

    /**
     * Inicializa o AutoDepois.secondVillage, configura os eventos.
     */
    secondVillage.init = function () {
        initialized = true

        if (!secondVillageService.isFeatureActive()) {
            return false
        }

        active = true

        $root.$on($eventType.SECOND_VILLAGE_JOB_COLLECTED, analyseJobs)
        $root.$on($eventType.SECOND_VILLAGE_VILLAGE_CREATED, analyseJobs)
    }

    /**
     * Inicia a analise dos trabalhos.
     */
    secondVillage.start = function () {
        if (!active) {
            return false
        }

        running = true
        loopTimeoutId = setInterval(analyseJobs, 60000)
        updateInfo(analyseJobs)
    }

    /**
     * Para a analise dos trabalhos.
     */
    secondVillage.stop = function () {
        if (!active) {
            return false
        }

        running = false
        clearInterval(loopTimeoutId)
    }

    /**
     * Retorna se o modulo está em funcionamento.
     */
    secondVillage.isRunning = function () {
        return active && running
    }

    /**
     * Retorna se o modulo está inicializado.
     */
    secondVillage.isInitialized = function () {
        return initialized
    }

    autoDeposit.secondVillage = secondVillage
})
