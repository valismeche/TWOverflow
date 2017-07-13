define('TWOverflow/autoDeposit/secondVillage', [
    'TWOverflow/autoDeposit',
    'helper/time'
], function (
    autoDeposit,
    $timeHelper
) {
    var running = false
    var active = false
    var initialized = false
    var jobs
    var day
    var loopTimeoutId
    var secondVillageService = injector.get('secondVillageService')

    var updateInfo = function (callback) {
        $socket.emit($route.SECOND_VILLAGE_GET_INFO, {}, function (data) {
            jobs = data.jobs
            day = data.day

            if (callback) {
                callback()
            }
        })
    }

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
        var job = filterAvailJobs(dayJobs)

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
     * Filtra os que trabalhos que não pertencem ao dia atual.
     */
    var filterAvailJobs = function (jobs) {
        var arrayJobs = []

        for (id in jobs) {
            arrayJobs.push(jobs[id])
        }

        // Apenas trabalhos que ainda não foram iniciados
        var filteredJobs = arrayJobs.filter(function (job) {
            return job.time_started === 0
        })

        // Posiciona os trabalhos que devem ser iniciados primeiro
        // no inicio da lista
        var sortedJobs = filteredJobs.sort(function (minor, major) {
            return minor.position > major.position
        })

        return sortedJobs[0]
    }

    var secondVillage = {}

    secondVillage.init = function () {
        initialized = true
        
        if (!secondVillageService.isFeatureActive()) {
            return false
        }

        active = true

        $root.$on($eventType.SECOND_VILLAGE_JOB_COLLECTED, analyseJobs)
        $root.$on($eventType.SECOND_VILLAGE_VILLAGE_CREATED, analyseJobs)
    }

    secondVillage.start = function () {
        if (!active) {
            return false
        }

        running = true
        loopTimeoutId = setInterval(analyseJobs, 60000)
        updateInfo(analyseJobs)
    }

    secondVillage.stop = function () {
        if (!active) {
            return false
        }

        running = false
        clearInterval(loopTimeoutId)
    }

    secondVillage.isRunning = function () {
        return active && running
    }

    secondVillage.isInitialized = function () {
        return initialized
    }

    autoDeposit.secondVillage = secondVillage
})
