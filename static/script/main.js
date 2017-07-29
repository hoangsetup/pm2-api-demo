$(document).ready(function () {
    var socket = io();
    // get list miners
    $.get("/miners", function (data) {
        data.forEach(function (t) {
            $('#tbl-miners').find('tbody').append(`
            <tr id="${t.name}">
                <td>${t.name}</td>
                <td>${getStatusLabel(t.pm2_env.status)}</td>
                <td>
                    <div class="btn-group">
                        <button type="button" class="btn btn-default btn-sm">CPU: ${t.monit.cpu} %</button>
                        <button type="button" class="btn btn-default btn-sm">RAM: ${(t.monit.memory / (1024 * 1024)).toFixed(1)} MB</button>
                      </div>
                </td>
                <td>
                    ${getPowerButton(t.pm2_env.status)}
                    <button type="button" class="btn btn-default btn-sm btn-action" data-action="restart">
                            <span class="glyphicon glyphicon-repeat success-color"></span> Restart
                    </button>
                    <button type="button" class="btn btn-default btn-sm btn-action" data-action="tail">
                            <span class="glyphicon glyphicon-eye-open success-color"></span> Tail logs
                    </button>
                </td>
            </tr>
            `)
        });
    });
    $(document).on('click', '.btn-action', function (e) {
        e.preventDefault();
        var self = $(this);
        var action = self.data('action');
        var process = self.parents('tr').attr('id');
        if (action !== "tail") {
            $.ajax(`/miners/${process}?action=${action}`, {
                type: "PUT",
                success: function (data) {
                    location.reload(); // :D
                },
                error: function (error) {
                    console.log(error);
                }
            });
        }
        if (action === "tail") {
            // To unsubscribe all listeners of an log event
            $('#tbl-miners').find('tbody').find('tr').each(function () {
                socket.off(`${$(this).attr('id')}:log`);
            });
            var jConsole = $('#console');
            jConsole.empty();
            socket.on(`${process}:log`, function (data) {
                if (jConsole.find('p').length > 32) {
                    jConsole.empty();
                }
                jConsole.append(`<p id="console-text">${data.log}</p>`);
                console.log(data);
            });
        }
    });
    function getStatusLabel(status) {
        switch (status) {
            case "stopped":
                return `<span class="label label-danger">${status}</span>`;
            case "online":
                return `<span class="label label-success">${status}</span>`;
            default:
                return `<span class="label label-default">${status}</span>`;
        }
    }

    function getPowerButton(status) {
        if (status === "online") {
            return `
            <button type="button" class="btn btn-default btn-sm btn-action" data-action="stop">
                    <span class="glyphicon glyphicon-flash danger-color"></span> Stop
            </button>
        `;
        }
        return `
            <button type="button" class="btn btn-default btn-sm btn-action" data-action="start">
                    <span class="glyphicon glyphicon-flash success-color"></span> Start
            </button>
        `;
    }
});