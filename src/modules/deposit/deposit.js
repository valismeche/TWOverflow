define('TWOverflow/autoDeposit', function () {
    var initialized = false
    var running = false
    var loopTimeoutId

    var analyseJobs = function () {
        var jobs = getJobData()

        if (hasRunningJob(jobs)) {
            return false
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

    var getJobData = function () {
        return $model.getSelectedCharacter().getResourceDeposit().jobData
    }

    var hasCollectibleJob = function (jobs) {
        for (var id in jobs) {
            if (jobs[id].state === 1) {
                return true
            }
        }

        return false
    }

    var getCollectibleJob = function (jobs) {
        for (var id in jobs) {
            if (jobs[id].state === 1) {
                return jobs[id]
            }
        }
    }

    var hasRunningJob = function (jobs) {
        for (var id in jobs) {
            if (jobs[id].state === 0) {
                return true
            }
        }

        return false
    }

    var hasReadyJob = function (jobs) {
        for (var id in jobs) {
            if (jobs[id].state === 2) {
                return true
            }
        }

        return false
    }

    var getReadyJob = function (jobs) {
        for (var id in jobs) {
            if (jobs[id].state === 2) {
                return jobs[id]
            }
        }

        return false
    }

    var collectJob = function (job) {
        $socket.emit($route.RESOURCE_DEPOSIT_COLLECT, {
            job_id: job.id,
            village_id: $model.getSelectedVillage().getId()
        })
    }

    var startJob = function (job) {
        $socket.emit($route.RESOURCE_DEPOSIT_START_JOB, {
            job_id: job.id
        })
    }


    var autoDeposit = {}

    autoDeposit.init = function () {
        initialized = true

        $root.$on($eventType.RESOURCE_DEPOSIT_JOB_COLLECTED, analyseJobs)
        $root.$on($eventType.RESOURCE_DEPOSIT_JOBS_REROLLED, analyseJobs)

        // Não podemos utilizar RESOURCE_DEPOSIT_JOB_COLLECTIBLE por que é chamado
        // múltiplas vezes em seguida e acaba fodendo com o script.
        
        // $root.$on($eventType.RESOURCE_DEPOSIT_JOB_COLLECTIBLE, analyseJobs)
    }

    autoDeposit.start = function () {
        running = true
        loopTimeoutId = setInterval(analyseJobs, 60000)
        analyseJobs()
    }

    autoDeposit.stop = function () {
        running = false
        clearInterval(loopTimeoutId)
    }

    autoDeposit.isRunning = function () {
        return running
    }

    autoDeposit.isInitialized = function () {
        return initialized
    }

    return autoDeposit
})
