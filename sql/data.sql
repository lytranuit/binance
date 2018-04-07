/*
SQLyog Ultimate v12.09 (64 bit)
MySQL - 5.6.25 : Database - binance
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`binance` /*!40100 DEFAULT CHARACTER SET latin1 */;

USE `binance`;

/*Table structure for table `candle` */

DROP TABLE IF EXISTS `candle`;

CREATE TABLE `candle` (
  `MarketName` varchar(50) NOT NULL,
  `interval` varchar(10) NOT NULL,
  `data` longtext,
  PRIMARY KEY (`MarketName`,`interval`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Data for the table `candle` */

LOCK TABLES `candle` WRITE;

UNLOCK TABLES;

/*Table structure for table `trade` */

DROP TABLE IF EXISTS `trade`;

CREATE TABLE `trade` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `MarketName` varchar(50) DEFAULT NULL,
  `price_buy` float DEFAULT NULL,
  `price_sell` float DEFAULT NULL,
  `timestamp_buy` timestamp(3) NULL DEFAULT NULL,
  `timestamp_sell` timestamp(3) NULL DEFAULT NULL,
  `is_sell` int(11) DEFAULT NULL,
  `amount` float DEFAULT '0.002',
  `test` int(11) DEFAULT '0',
  `deleted` int(11) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=latin1;

/*Data for the table `trade` */

LOCK TABLES `trade` WRITE;

insert  into `trade`(`id`,`MarketName`,`price_buy`,`price_sell`,`timestamp_buy`,`timestamp_sell`,`is_sell`,`amount`,`test`,`deleted`) values (3,'ENGBTC',0.0002092,NULL,'2018-04-03 22:13:14.000',NULL,NULL,0.002,0,0),(8,'GVTBTC',0.002735,NULL,'2018-04-03 23:50:16.501',NULL,NULL,0.001,0,0),(10,'TNTBTC',0.00001,0.00001012,'2018-04-04 04:05:09.366','2018-04-05 20:31:17.289',1,0.001,0,0),(11,'AIONBTC',0.0002965,NULL,'2018-04-04 06:46:38.184',NULL,NULL,0.001,0,0),(12,'ENGBTC',0.00020141,NULL,'2018-04-04 07:05:07.214',NULL,NULL,0.001,0,0),(14,'ZRXBTC',0.00007898,0.00007993,'2018-04-04 07:50:10.045','2018-04-06 00:39:13.400',1,0.001,0,0),(15,'WPRBTC',0.00001289,NULL,'2018-04-04 08:40:21.856',NULL,NULL,0.001,0,0),(16,'IOSTBTC',0.00000335,0.00000383,'2018-04-04 08:40:21.867','2018-04-04 11:35:08.155',1,0.001,0,0),(17,'WANBTC',0.00046158,NULL,'2018-04-04 08:40:21.870','2018-04-06 06:55:57.346',1,0.001,0,1),(21,'MTHBTC',0.00001136,0.00001162,'2018-04-04 12:40:35.682','2018-04-04 13:57:06.132',1,0.001,0,0),(22,'XLMBTC',0.00003065,NULL,'2018-04-04 14:50:20.405',NULL,NULL,0.001,0,0),(23,'PIVXBTC',0.000544,0.0005498,'2018-04-04 18:56:31.991','2018-04-05 06:41:44.013',1,0.001,0,0),(24,'IOTABTC',0.00014337,0.00014298,'2018-04-05 07:42:11.595','2018-04-05 11:22:21.304',1,0.001,0,0),(25,'AEBTC',0.0002056,0.0002078,'2018-04-05 11:50:16.300','2018-04-06 10:08:51.009',1,0.001,0,0),(26,'XVGBTC',0.00000788,0.00000823,'2018-04-05 12:55:08.748','2018-04-05 15:17:30.000',1,0.001,0,0),(27,'ASTBTC',0.00003363,0.00003406,'2018-04-05 16:25:06.062','2018-04-05 21:22:22.826',1,0.001,0,0),(28,'CTRBTC',0.00001841,0.00001864,'2018-04-05 22:00:58.530','2018-04-05 22:02:59.668',1,0.001,0,0),(29,'GXSBTC',0.0003734,0.0003774,'2018-04-06 00:45:16.013','2018-04-06 06:28:13.637',1,0.001,0,0),(30,'XVGBTC',0.00000808,0.00000817,'2018-04-06 00:55:01.871','2018-04-06 06:28:57.811',1,0.001,0,0),(31,'BRDBTC',0.00005901,0.00005964,'2018-04-06 04:11:33.406','2018-04-06 16:56:07.524',1,0.001,0,0),(32,'WANBTC',0.000461,NULL,'2018-04-06 06:41:27.107','2018-04-06 06:55:57.346',1,0.001,0,1),(33,'WANBTC',0.00046129,0.000465,'2018-04-06 06:55:57.346','2018-04-06 06:55:57.346',1,0.002,0,0),(34,'QTUMBTC',0.001949,0.001979,'2018-04-06 11:03:12.206','2018-04-07 07:41:02.092',1,0.001,0,0),(35,'POABTC',0.00004568,NULL,'2018-04-06 14:05:08.651',NULL,NULL,0.001,0,0),(36,'STORMBTC',0.00000396,0.00000404,'2018-04-06 14:15:04.287','2018-04-06 14:21:51.869',1,0.001,0,0),(37,'STORJBTC',0.00010348,0.00010488,'2018-04-06 14:32:42.916','2018-04-06 18:52:00.548',1,0.001,0,0),(38,'YOYOBTC',0.00001129,0.00001162,'2018-04-06 18:35:07.649','2018-04-06 21:29:41.990',1,0.001,0,0),(39,'FUELBTC',0.00000766,0.00000775,'2018-04-06 20:29:33.073','2018-04-07 06:59:28.879',1,0.001,0,0),(40,'POEBTC',0.00000396,NULL,'2018-04-07 01:02:19.314',NULL,NULL,0.001,0,0);

UNLOCK TABLES;

/*Table structure for table `trade_1h` */

DROP TABLE IF EXISTS `trade_1h`;

CREATE TABLE `trade_1h` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `MarketName` varchar(50) DEFAULT NULL,
  `price_buy` float DEFAULT NULL,
  `price_sell` float DEFAULT NULL,
  `timestamp_buy` timestamp(3) NULL DEFAULT NULL,
  `timestamp_sell` timestamp(3) NULL DEFAULT NULL,
  `is_sell` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Data for the table `trade_1h` */

LOCK TABLES `trade_1h` WRITE;

UNLOCK TABLES;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
