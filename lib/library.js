function message(msg) {
    //Find
    let el = document.getElementById("el-msg");
    if (!el) {
        //Build
        el = document.createElement("div");
        el.id = "el-msg";
        el.setAttribute("style", "background-color: black; color: white;font-size: 15px; position:absolute;top:10%;left:75%");
        el.innerHTML = "";

        //Remove after timeout
        setTimeout(function () {
            el.parentNode.removeChild(el);
        }, 5000);

        document.body.appendChild(el);
    }

    el.innerHTML += '<br/>' + msg;

}

function waitClick(selector, callback=()=>{}) {
    waitEE(selector, (e) => {
        e.click();
        callback();
    });
}

function waitInput(selector, inputValue) {
    waitEE(selector, (e) => {
        e.value = inputValue
        e.dispatchEvent(new Event('input', {'bubbles': true}));
    })
}

function waitEE(selector, callback, count = 3) {
    const el = document.querySelector(selector);

    if (el) {
        return callback(el);
    }

    if (count > 0) {
        setTimeout(() => waitEE(selector, callback, count - 1), 2000);
    } else {
        console.log("Wait Element Failed, exiting Recursion: " + selector);
    }
}

function waitJEE(selector, callback, count = 3) {
    const el = $(selector);

    if (el.length) {
        return callback(el);
    }

    if (count > 0) {
        setTimeout(() => waitJEE(selector, callback, count - 1), 2000);
    } else {
        console.log("Jquery Wait Element Failed, exiting Recursion: " + selector);
    }
}

function waitOn(id, timeout, callback) {
    //Find
    let mutexId = "el-msg-" + id;
    let el = document.getElementById(mutexId);
    if (!el) {
        //Build
        el = document.createElement("div");
        el.id = mutexId;

        //Remove after timeout
        setTimeout(function () {
            el.parentNode.removeChild(el);
            // console.log('WaitOn Finished: '+ id);
            callback();
        }, timeout);

        document.body.appendChild(el);
    }
}

function attributeObserver(target, callback) {
    // Create an observer instance
    let observer = new MutationObserver(function (mutations) {
        //console.log(mutations);
        if (mutations.length > 0) {
            callback();
        }
    });

    // Pass in the target node, as well as the observer options
    observer.observe(target, {
        subtree: true,
        attributes: true,
        characterData: true
    });
}

function nodeObserver(target, callback) {
    // Create an observer instance
    let observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            //console.log(mutation);
            if (mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length)) {
                callback();
            }
        });
    });

    // Pass in the target node, as well as the observer options
    observer.observe(target, {
        childList: true,
    });

    // Later, you can stop observing
    //observer.disconnect();
}

function reloadPage() {
    //-- User feedback, esp useful with time delay:
    document.title = "Reloading...";
    /*-- Important:
        May need to wait 1 to 300 seconds to allow for
        alerts to get created and ]reflect.
        1222 == 1.2 seconds
    */
    window.scrollTo(0, 0);
    setTimeout(() => {
        location.reload();
    }, 3000);
}

function isModifierKey(modifier, key, e) {
    if (e.key.toLowerCase() == key && modifier) {
        e.preventDefault();
        return true;
    } else {
        return false;
    }
}