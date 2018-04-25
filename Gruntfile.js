module.exports = function(grunt) {
  grunt.initConfig({
    uglify: {
      gopjs: {
        src: [
        'public/others/jquery/dist/jquery.min.js',
        'public/others/popper.js/dist/umd/popper.min.js',
        'public/others/bootstrap/dist/js/bootstrap.min.js',
        'public/others/fancybox/jquery.fancybox.min.js',
        'public/js/moment.js',
        'public/js/off-canvas.js',
        'public/js/color-hash.js',
        'public/iguanachart/dependencies/uikit/js/uikit.min.js',
        'public/iguanachart/dependencies/jquery.event.move.js',
        'public/iguanachart/dependencies/jquery.mousewheel.min.js',
        'public/iguanachart/dependencies/hammer.min.js',
        'public/iguanachart/dependencies/jquery.hammer.js',
        'public/iguanachart/dependencies/jsrender.min.js',
        'public/iguanachart/dependencies/jquery.qtip.min.js',
        'public/iguanachart/dependencies/jquery-minicolors/jquery.minicolors.min.js',
        'public/iguanachart/i18n.js',
        'public/iguanachart/iguanachart.js',
        'public/js/socket.io.js',
        'public/DataTables/datatables.min.js',      'public/js/public.js',
        'public/js/main.js',
        'public/js/client.js',

        ],
        dest: 'public/dest/js/main.min.js'
      },
    },
    cssmin:{
      gopcss: {
        src: [
        'pulbic/others/mdi/css/materialdesignicons.min.css',
        'public/others/simple-line-icons/css/simple-line-icons.css',
        'public/others/fancybox/jquery.fancybox.css',
        'public/css/style.css',
        'public/others/simple-line-icons/css/simple-line-icons.css',
        'public/others/simple-line-icons/css/simple-line-icons.css',
        'public/others/simple-line-icons/css/simple-line-icons.css',
        'public/others/simple-line-icons/css/simple-line-icons.css',
        'public/others/simple-line-icons/css/simple-line-icons.css',
        'public/iguanachart/dependencies/jquery.qtip.min.css',
        'public/iguanachart/dependencies/jquery-minicolors/jquery.minicolors.css',
        'public/iguanachart/iguanachart.min.css',
        'public/DataTables/datatables.min.css'
        ],
        dest: 'public/dest/css/style.min.css'
      },
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.registerTask('default', ['uglify','cssmin']);
};