import { OWNER as O } from "./owner";

// Traducció de l'ESBORRANY en castellà (es.ts), pendent de revisió jurídica. Si hi ha diferències, preval el text en castellà.

const avisoLegal = `## 1. Titular del lloc web

En compliment de l'article 10 de la Llei 34/2002, de serveis de la societat de la informació i de comerç electrònic (LSSI-CE), s'informa de les dades del titular d'aquest lloc web:

- Titular: ${O.name}
- NIF: ${O.nif}
- Domicili: ${O.address}, Espanya
- Correu electrònic: ${O.email}
- Telèfon: [[telèfon de contacte]]
- Dades registrals: Registre Mercantil de Barcelona, [[tom, foli, full i inscripció]]

Aquest avís s'aplica al lloc web ${O.web} i a la botiga en línia ${O.shop} (d'ara endavant, «el lloc web»).

## 2. Objecte

El lloc web informa sobre SphereWars: Otro Mundo, un joc de miniatures, el seu univers, les seves regles descarregables, els seus esdeveniments i la seva comunitat, i permet comprar miniatures i productes del joc.

## 3. Condicions d'ús

L'accés al lloc web és gratuït, llevat del cost de la connexió. Qui l'utilitza es compromet a fer-ho de manera lícita, sense perjudicar el lloc web ni tercers, i sense intentar accedir a zones restringides, com el tauler d'administració.

Les compres es regeixen per les [Condicions de venda](/legal/condiciones) i per la informació sobre [Desistiment i devolucions](/legal/devoluciones). El tractament de dades personals s'explica a la [Política de privacitat](/legal/privacidad) i l'ús de galetes, a la [Política de galetes](/legal/cookies).

## 4. Propietat intel·lectual i industrial

Els textos, regles, il·lustracions, fotografies, vídeos, logotips, noms de faccions i personatges, i el disseny del lloc web pertanyen a ${O.name} o als seus autors i llicenciants, i estan protegits per la normativa de propietat intel·lectual i industrial. [[Confirmar si la marca SphereWars està registrada, davant de quina oficina (OEPM o EUIPO) i a nom de qui]].

Es permet descarregar i imprimir el reglament i les targetes que el lloc web ofereix gratis per a ús personal i per jugar. Qualsevol altre ús, en particular la reproducció, distribució o transformació amb finalitats comercials, requereix autorització prèvia per escrit.

## 5. Enllaços

El lloc web enllaça amb serveis de tercers, com Instagram, YouTube o Discord. En seguir aquests enllaços se surt del lloc web i s'apliquen les condicions i polítiques de privacitat de cada servei. ${O.name} no en controla el contingut ni en respon.

## 6. Responsabilitat

${O.name} procura que la informació del lloc web sigui correcta i estigui actualitzada, però pot contenir errors, que es corregiran tan aviat com es detectin. No es respon d'interrupcions del servei per causes tècniques alienes o de força major. Aquesta limitació no afecta els drets que la llei reconeix als consumidors.

## 7. Legislació aplicable

Aquest avís es regeix per la legislació espanyola. Si qui utilitza el lloc web és consumidor, són competents els jutjats i tribunals que correspongui segons la llei, inclosos els del seu domicili.
`;

const privacidad = `## 1. Responsable del tractament

- Responsable: ${O.name}
- NIF: ${O.nif}
- Domicili: ${O.address}, Espanya
- Correu electrònic per a qüestions de privacitat: ${O.email}
- Delegat de protecció de dades: [[confirmar si se n'ha designat; previsiblement no és obligatori]]

Aquesta política explica com es tracten les dades personals a ${O.web} i a la botiga ${O.shop}, d'acord amb el Reglament (UE) 2016/679 (RGPD) i la Llei orgànica 3/2018 de protecció de dades personals i garantia dels drets digitals (LOPDGDD).

## 2. Quines dades tractem, per a què i amb quina base legal

### Compres a la botiga

- Dades: nom i cognoms, correu electrònic, adreça de facturació i d'enviament, telèfon (opcional), productes comprats, imports, notes de la comanda i, com fa WooCommerce per defecte, l'adreça IP i el navegador des dels quals es va fer la comanda. Les dades de la targeta o de Bizum no les rebem: les tracta l'entitat de pagament.
- Finalitat: gestionar la comanda, el cobrament, l'enviament, les factures, l'atenció al client, el desistiment, les devolucions i la garantia. Els avisos de cada comanda arriben al correu del venedor.
- Base legal: l'execució del contracte de compravenda (article 6.1.b RGPD) i el compliment d'obligacions legals, com les fiscals i comptables (article 6.1.c RGPD). La IP i el navegador de la comanda es tracten per interès legítim a prevenir el frau (article 6.1.f RGPD) [[confirmar amb l'assessor o desactivar-ne el registre]].
- Conservació: mentre duri la relació i, després, bloquejades durant els terminis legals: sis anys per a la documentació mercantil (article 30 del Codi de comerç), els terminis de prescripció tributària i tres anys de garantia des del lliurament [[confirmar terminis]].

### Formulari de contacte

Només s'aplica si el formulari de contacte està actiu al lloc web.

- Dades: nom, correu electrònic, assumpte, missatge i idioma. De l'adreça IP només es desa un codi xifrat (hash), que serveix per limitar l'enviament massiu de missatges.
- Finalitat: respondre la consulta.
- Base legal: el consentiment que es dona en marcar la casella del formulari (article 6.1.a RGPD). Es pot retirar en qualsevol moment, sense que afecti el que s'ha tractat abans.
- Conservació: el temps necessari per respondre i, com a màxim, [[termini de conservació dels missatges, per exemple un any]].

### Missatges per correu electrònic

Si ens escrius a ${O.email}, fem servir les teves dades per respondre't, amb base en la teva sol·licitud i en el nostre interès legítim a atendre-la (article 6.1.f RGPD), i les conservem mentre sigui necessari per atendre-la.

### Navegació i seguretat

- Dades: adreça IP, navegador, pàgines sol·licitades, data i hora, als registres tècnics dels servidors.
- Finalitat: servir el lloc web, mantenir-ne la seguretat i detectar abusos.
- Base legal: interès legítim en el funcionament segur del lloc web (article 6.1.f RGPD).
- Conservació: la que fixi cada proveïdor d'allotjament per als seus registres [[confirmar terminis de Vercel i cdmon]].

No enviem butlletins ni comunicacions comercials, no fem servir galetes d'analítica ni de publicitat, no elaborem perfils i no prenem decisions automatitzades amb efectes jurídics.

## 3. Destinataris i encarregats del tractament

No venem ni cedim dades personals. Només les coneixen els proveïdors que necessitem per prestar el servei, com a encarregats del tractament o com a responsables independents en el seu àmbit, i les autoritats quan ho exigeixi la llei:

- Vercel Inc. (Estats Units): allotjament del lloc web ${O.web}.
- 10dencehispahard SL (cdmon, Espanya): allotjament de la botiga ${O.shop}, que funciona amb WordPress i WooCommerce, i on es desen les comandes.
- Redsys Servicios de Procesamiento SL i [[nom de l'entitat bancària del venedor]]: cobrament amb targeta i Bizum. Actuen com a responsables independents del tractament de les dades de pagament [[confirmar rol]].
- [[Nom de l'empresa de transport]]: lliurament de les comandes (nom, adreça i telèfon d'enviament).
- Microsoft (servei de correu Outlook/Hotmail): correu electrònic del venedor, on arriben les comandes i els missatges [[confirmar proveïdor i condicions]].
- Només si el formulari de contacte està actiu: Resend Inc. (Estats Units), enviament dels missatges per correu; Supabase Inc., base de dades on es desen els missatges [[regió dels servidors]]; i Cloudflare Inc. (Estats Units), si està activa la verificació antispam Turnstile.
- [[Assessoria fiscal o comptable, si n'hi ha]].
- Administració tributària, jutjats i forces de seguretat, quan la llei ho exigeixi.

## 4. Transferències internacionals

Alguns proveïdors (Vercel, Microsoft i, si s'utilitzen, Resend, Supabase i Cloudflare) són empreses dels Estats Units o hi poden tractar dades. Aquestes transferències s'emparen en la decisió d'adequació del Marc de Privacitat de Dades UE-EUA per a les empreses adherides o, si no, en les clàusules contractuals tipus de la Comissió Europea [[verificar l'adhesió i la garantia de cada proveïdor]].

## 5. Els teus drets

Pots exercir els drets d'accés, rectificació, supressió, oposició, limitació del tractament i portabilitat, i retirar el consentiment en qualsevol moment, escrivint a ${O.email} o per correu postal a ${O.address}. Indica quin dret exerceixes. Si tenim dubtes raonables sobre la teva identitat, et podrem demanar informació addicional per confirmar-la. Respondrem en el termini d'un mes, ampliable en els casos previstos al RGPD.

Si consideres que no hem atès bé els teus drets, pots reclamar davant l'Agència Espanyola de Protecció de Dades (AEPD), C/ Jorge Juan 6, 28001 Madrid, https://www.aepd.es

## 6. Menors

La botiga s'adreça a persones majors d'edat. Els menors de 14 anys no poden facilitar les seves dades sense el consentiment dels pares o tutors (article 7 LOPDGDD).

## 7. Seguretat

Apliquem mesures tècniques i organitzatives adequades al risc: connexió xifrada (https), accés restringit als taulers de gestió i proveïdors que ofereixen garanties de seguretat.

## 8. Canvis

Si aquesta política canvia, publicarem la nova versió en aquesta pàgina amb la seva data.
`;

const cookies = `## 1. Què són

Les galetes (cookies) són petits fitxers que un lloc web desa al navegador. L'emmagatzematge local (localStorage) és un mecanisme semblant. Aquesta política explica quines fan servir ${O.web} i ${O.shop}, d'acord amb l'article 22.2 de la LSSI-CE.

## 2. Resum

Només fem servir galetes i emmagatzematge tècnics, estrictament necessaris per al servei que demanes: recordar l'idioma, el carretó i la comanda, i l'accés de les persones que gestionen el lloc. No fem servir galetes d'analítica, publicitat ni xarxes socials. Per això no et demanem consentiment, però t'hi informem [[confirmar amb l'assessor que totes estan exemptes]].

Les fonts tipogràfiques i els vídeos se serveixen des del nostre propi domini i no hi ha vídeos ni continguts de tercers inserits. Els enllaços a Instagram, YouTube i Discord són enllaços normals: aquests serveis només instal·len les seves galetes si els visites.

## 3. Lloc web (${O.web})

| Nom | Tipus | Finalitat | Durada | Necessària |
| sw_locale | Galeta pròpia | Recordar l'idioma del web (es, en o ca) | 1 any | Sí |
| sw_cart_v1 | Emmagatzematge local | Desar els productes del carretó i les quantitats, sense dades personals | Fins que buidis el carretó o esborris les dades del navegador | Sí |
| sw_cleared_orders_v1 | Emmagatzematge local | Recordar les últimes comandes acabades per no buidar el carretó dues vegades | Fins que esborris les dades del navegador | Sí |
| sb-…-auth-token | Galeta pròpia | Mantenir la sessió al tauler d'administració. Només per al personal autoritzat | Sessió del tauler | Sí |
| __prerender_bypass, __next_preview_data | Galetes pròpies | Vista prèvia d'esborranys. Només per al personal autoritzat | Sessió | Sí |

Si el formulari de contacte fa servir la verificació antispam Cloudflare Turnstile, en obrir la pàgina de contacte es carrega un servei de Cloudflare Inc. que protegeix el formulari d'enviaments automàtics [[verificar què desa Turnstile al navegador]].

## 4. Botiga (${O.shop})

La botiga funciona amb WordPress i WooCommerce. El pagament s'hi fa.

| Nom | Tipus | Finalitat | Durada | Necessària |
| wp_woocommerce_session_… | Galeta pròpia | Identificar el carretó i la sessió de compra | 2 dies | Sí |
| woocommerce_cart_hash | Galeta pròpia | Detectar canvis al carretó | Sessió | Sí |
| woocommerce_items_in_cart | Galeta pròpia | Saber si el carretó té productes | Sessió | Sí |
| wordpress_*, wordpress_logged_in_*, wp-settings-* | Galetes pròpies | Sessió del personal que gestiona la botiga | Sessió o fins a 1 any | Sí |

Les galetes d'atribució de comandes de WooCommerce (sbjs_*) estan desactivades. [[Revisar a la botiga real si el tema o algun connector afegeix altres galetes, emmagatzematge local o recursos de tercers, com Google Fonts, i completar aquesta taula]].

En pagar, la passarel·la de Redsys s'obre al seu propi domini i hi aplica les seves galetes tècniques, sota la seva responsabilitat.

## 5. Com gestionar-les

Pots veure i esborrar les galetes i l'emmagatzematge local des de la configuració del navegador. Si els bloqueges, el web no recordarà l'idioma ni el carretó, i no podràs completar una compra.

## 6. Canvis

Si en el futur afegim galetes que no siguin necessàries, com les d'analítica, et demanarem abans el consentiment i actualitzarem aquesta política.
`;

const condiciones = `## 1. Venedor i àmbit

Aquestes condicions regulen les compres a la botiga en línia de SphereWars. El venedor és ${O.name}, NIF ${O.nif}, amb domicili a ${O.address}, Espanya, i correu electrònic ${O.email}. Telèfon: [[telèfon de contacte]].

S'apliquen a les compres de persones consumidores, segons el Reial decret legislatiu 1/2007, text refós de la Llei general per a la defensa dels consumidors i usuaris (LGDCU). [[Decidir si també es ven a empreses i botigues i amb quines condicions]].

La versió vigent és la publicada al web en el moment de la comanda. Abans de pagar l'has d'acceptar.

## 2. Productes

Venem miniatures de resina de 28 mm per al joc SphereWars, que es lliuren sense muntar i sense pintar, i altres productes del joc. Les fotografies poden mostrar miniatures muntades i pintades només com a exemple. Muntar-les pot requerir eines i cola, que no s'inclouen [[confirmar]].

[[Advertència de seguretat i edat recomanada: per exemple, «No apte per a menors de 14 anys. Conté peces petites». Confirmar amb l'assessor]].

## 3. Preus i impostos

Els preus són en euros i inclouen l'IVA del 21 %. Les despeses d'enviament s'indiquen a part i se sumen abans de confirmar la comanda.

Per als enviaments fora de la Unió Europea, la botiga mostra en el pagament el preu sense IVA espanyol. Els aranzels, impostos d'importació i gestions duaneres del país de destinació van a càrrec del comprador [[confirmar]]. [[Tractament fiscal dels enviaments a Canàries, Ceuta i Melilla: pendent de decidir amb l'assessor]].

L'import total, amb impostos i enviament, es mostra sempre abans de pagar.

## 4. Despeses d'enviament

| Destinació | Despeses d'enviament | Enviament gratuït |
| Espanya | 5 € | Comandes a partir de 50 € |
| Unió Europea i resta del món | 15 € | Comandes a partir de 100 € |

Les despeses inclouen l'IVA quan correspon. Es ven a tots els països.

## 5. Com es fa la comanda

- Tries els productes i els afegeixes al carretó a ${O.web}.
- Prems pagar i passes al procés de pagament de la botiga ${O.shop}, on indiques el nom, el correu electrònic i les adreces. El telèfon és opcional.
- Abans de pagar veus el resum amb productes, impostos, enviament i total, i pots tornar enrere per corregir qualsevol dada.
- Acceptes aquestes condicions i pagues. La comanda implica una obligació de pagament.
- Reps per correu electrònic la confirmació de la comanda.

El contracte se celebra en castellà [[confirmar si s'ofereix en altres idiomes]]. La comanda queda arxivada a la botiga i ens en pots demanar una còpia en qualsevol moment.

## 6. Pagament

Es pot pagar amb targeta o amb Bizum mitjançant la passarel·la segura Redsys de la nostra entitat bancària. El càrrec es fa en confirmar la comanda. No veiem ni desem les dades de la targeta.

## 7. Lliurament

- Transportista: [[nom de l'empresa de transport]].
- Termini de preparació i de lliurament: [[terminis per destinació]]. Si no s'indica cap altre termini, lliurarem la comanda en un màxim de 30 dies naturals des de la compra (article 66 bis LGDCU).
- Si un producte no està disponible després de pagar, t'avisarem i et retornarem el que n'hagis pagat sense demora indeguda.
- El risc de pèrdua o dany passa a tu quan reps la comanda.

Si el paquet arriba malmès, consulta el procediment a [Desistiment i devolucions](/legal/devoluciones).

## 8. Dret de desistiment

Tens 14 dies naturals per desistir de la compra sense donar explicacions. Les condicions, el procediment i el formulari són a [Desistiment i devolucions](/legal/devoluciones).

## 9. Garantia

Responem de qualsevol falta de conformitat dels productes que existeixi en el moment del lliurament i es manifesti en un termini de tres anys des d'aquest (articles 114 i següents LGDCU). Pots triar entre la reparació o la substitució, llevat que sigui impossible o desproporcionat i, si escau, demanar una rebaixa del preu o la resolució del contracte. Aquestes solucions són gratuïtes per a tu, inclosos els enviaments.

No són faltes de conformitat els danys produïts en muntar, tallar, polir, enganxar o pintar les peces, ni els causats per un ús indegut.

## 10. Atenció al client i reclamacions

Pots escriure'ns a ${O.email} per a qualsevol consulta, incidència o reclamació. Et respondrem tan aviat com puguem [[termini de resposta]]. [[Fulls oficials de reclamació i requisits de la normativa catalana de consum: confirmar amb l'assessor]].

## 11. Resolució de conflictes

Si no arribem a un acord, pots adreçar-te als serveis públics de consum, com l'Agència Catalana del Consum o l'oficina municipal d'informació al consumidor de la teva localitat, i a les juntes arbitrals de consum. [[Indicar si ${O.name} està adherida al Sistema Arbitral de Consum o a una altra entitat de resolució alternativa de litigis]].

La plataforma europea de resolució de litigis en línia (ODR) va deixar de funcionar el 20 de juliol de 2025, per això no s'enllaça.

## 12. Llei aplicable

Aquestes condicions es regeixen per la legislació espanyola, sens perjudici dels drets que et reconegui la llei del teu país de residència si ets consumidor en un altre Estat. Per a qualsevol litigi són competents els jutjats i tribunals que correspongui segons la llei, inclosos els del teu domicili.
`;

const devoluciones = `## 1. Dret de desistiment

Pots desistir de la compra en un termini de 14 dies naturals sense indicar-ne el motiu (articles 102 i següents LGDCU). El termini comença el dia que tu, o la persona que indiquis que no sigui el transportista, rep els productes. Si una comanda arriba en diversos lliuraments, compta des de l'últim.

## 2. Com exercir-lo

Abans que acabi el termini, comunica'ns la teva decisió de manera clara:

- per correu electrònic a ${O.email}, o
- per correu postal a ${O.name}, ${O.address}.

Pots fer servir el [formulari de desistiment](#formulario-de-desistimiento) d'aquesta pàgina, tot i que no és obligatori. Et confirmarem la recepció per correu electrònic. [[Funció de desistiment al web exigida per la Directiva (UE) 2023/2673: confirmar amb l'assessor la transposició a Espanya i com implantar-la]].

## 3. Devolució dels productes

Envia els productes a [[adreça de devolució, si no és el domicili indicat]] sense demora indeguda i, com a màxim, en 14 dies naturals des que ens comuniquis el desistiment.

Cost de l'enviament de tornada: [[decidir qui el paga: el comprador o el venedor]].

Pots comprovar l'estat dels productes com ho faries en una botiga. Si els manipules més enllà d'això, per exemple en separar les peces de les colades, tallar-les, polir-les, enganxar-les o pintar-les, respondràs de la disminució del seu valor (article 108 LGDCU).

## 4. Reemborsament

Et retornarem tot el que hagis pagat, incloses les despeses d'enviament inicials (llevat del sobrecost si vas triar un enviament diferent del més barat que oferim), sense demora indeguda i com a màxim en 14 dies naturals des que ens comuniquis el desistiment. Podem esperar a rebre els productes, o que ens demostris que els has enviat, abans de reemborsar.

Farem servir el mateix mitjà de pagament que vas utilitzar, llevat que n'acordem un altre. No hauràs de pagar cap comissió pel reemborsament.

## 5. Productes malmesos, erronis o incomplets

- Si el paquet arriba visiblement malmès, indica-ho al transportista en rebre'l, si és possible.
- Escriu-nos a ${O.email} tan aviat com puguis, amb el número de comanda i fotografies del paquet i dels productes.
- Et direm com retornar-los, si cal, i t'enviarem un producte substitut o et retornarem els diners, a la teva elecció, segons la garantia legal.
- En aquests casos, els enviaments van a càrrec nostre.

Avisar-nos aviat ens ajuda a reclamar al transportista, però no redueix els teus drets: la garantia legal de conformitat és de tres anys des del lliurament. Consulta les [Condicions de venda](/legal/condiciones).

## Formulari de desistiment {#formulario-de-desistimiento}

Model de formulari (annex B de la LGDCU). Emplena'l i envia'l només si vols desistir del contracte.

- A l'atenció de: ${O.name}, ${O.address}, ${O.email}
- Per la present li comunico que desisteixo del meu contracte de venda del bé següent: [indica els productes]
- Demanat el: [data] / rebut el: [data]
- Número de comanda: [número]
- Nom del consumidor: [nom]
- Adreça del consumidor: [adreça]
- Signatura del consumidor (només si el formulari es presenta en paper)
- Data: [data]
`;

export const ca = { "aviso-legal": avisoLegal, privacidad, cookies, condiciones, devoluciones };
